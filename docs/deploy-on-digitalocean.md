# Deploying and Optimizing Xget on DigitalOcean

Xget itself is shipped as a container image, so it fits very naturally into DigitalOcean’s ecosystem (Droplets, App Platform, Kubernetes, and Container Registry).

This guide explains how to run Xget efficiently on DigitalOcean and how to design a simple, robust acceleration layer for your team.

## 1. Which DigitalOcean product should I use for Xget?

Depending on your scale and operations model, you can pick one of these typical setups:

| Scenario                                    | Recommended option             | Characteristics                                                     |
| ------------------------------------------- | ------------------------------ | ------------------------------------------------------------------- |
| Personal / small team, simple traffic       | Droplet + Docker Compose       | Lowest cost, closest to the official self-hosting examples          |
| Small / mid-size team, prefer fully managed | App Platform (container mode)  | Automatic HTTPS, deployments, and autoscaling                       |
| Large team / enterprise, complex traffic    | DigitalOcean Kubernetes (DOKS) | Most flexible; supports fine-grained scaling and rollout strategies |

You can also use DigitalOcean Container Registry (DOCR) for your own Xget builds or to host business images that Xget will accelerate.

## 2. Option 1: Droplet + Docker Compose (closest to "plain" self-hosting)

### 2.1 Prerequisites

1. **Create a Droplet**

   * Recommended OS: Ubuntu 22.04 / 24.04 LTS.
   * Size suggestions:

     * Personal / small team: 1 vCPU / 1–2 GB RAM to start with.
     * High concurrent downloads: prefer Premium Intel/AMD or CPU-Optimized Droplets.
   * Region: pick a region close to your main users or to upstream services (e.g., GitHub, GHCR, DOCR).

2. **Configure DNS**

   In DigitalOcean DNS, create a record, for example:

   * `xget.example.com` → your Droplet’s public IP address.

3. **Install Docker & Docker Compose (example on Ubuntu)**

   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y

   # Install dependencies
   sudo apt install -y ca-certificates curl gnupg

   # Docker’s official GPG key and repo
   sudo install -m 0755 -d /etc/apt/keyrings
   curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
     sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

   echo \
     "deb [arch=$(dpkg --print-architecture) \
     signed-by=/etc/apt/keyrings/docker.gpg] \
     https://download.docker.com/linux/ubuntu \
     $(lsb_release -cs) stable" | \
     sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

   sudo apt update
   sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

   # Allow current user to run docker without sudo (optional)
   sudo usermod -aG docker $USER
   ```

   Log out and back in so group changes take effect.

### 2.2 Deploy Xget using Docker Compose

Based on the self-hosting examples in the Xget README, it’s recommended to manage the container via Docker Compose.

1. **Create a directory and `docker-compose.yml`:**

   ```bash
   mkdir -p ~/xget && cd ~/xget
   ```

   ```yaml
   # docker-compose.yml
   version: '3.8'

   services:
     xget:
       image: ghcr.io/xixu-me/xget:latest
       container_name: xget
       # Bind only to 127.0.0.1; expose via reverse proxy
       ports:
         - "127.0.0.1:8080:8080"
       restart: unless-stopped
   ```

2. **Bring up the service:**

   ```bash
   docker compose up -d
   ```

   Now Xget is running inside the Droplet on `127.0.0.1:8080`.

### 2.3 Expose HTTPS via nginx + Let’s Encrypt

Instead of exposing port 8080 directly, run nginx on the Droplet as a reverse proxy with HTTPS.

1. **Install nginx and Certbot:**

   ```bash
   sudo apt install -y nginx certbot python3-certbot-nginx
   ```

2. **Request a certificate (example: `xget.example.com`):**

   ```bash
   sudo certbot --nginx -d xget.example.com
   ```

3. **Configure reverse proxy**

   Certbot will create a `server` block for you. You can adapt/add configuration like:

   ```nginx
   server {
       listen 80;
       server_name xget.example.com;
       return 301 https://$host$request_uri;
   }

   server {
       listen 443 ssl http2;
       server_name xget.example.com;

       # ssl_certificate / ssl_certificate_key and related settings
       # are usually injected by Certbot automatically.

       location / {
           proxy_pass         http://127.0.0.1:8080;
           proxy_set_header   Host              $host;
           proxy_set_header   X-Real-IP         $remote_addr;
           proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
           proxy_set_header   X-Forwarded-Proto $scheme;

           # Longer timeouts for big downloads
           proxy_read_timeout  600s;
           proxy_send_timeout  600s;
       }
   }
   ```

4. **Reload nginx:**

   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

Now users can access Xget via `https://xget.example.com` through nginx → Xget container.

### 2.4 Harden security with DigitalOcean Cloud Firewall

To reduce attack surface and abuse risk:

* In Cloud Firewalls:

  * Allow inbound only: `22` (SSH), `80` (HTTP) and `443` (HTTPS).
  * Do *not* expose `8080` to the public Internet.
* If needed, further restrict:

  * Only allow company office IP ranges or CI/CD nodes.
  * Combine with a VPN or other gateway if you need more control.

## 3. Option 2: DigitalOcean App Platform (fully managed)

App Platform can run Xget directly from a container image or source code repo. It handles load balancing, TLS, and autoscaling for you, which is great if you don’t want to manage servers.

### 3.1 Basic flow

1. **Prepare the container image**

   Two common options:

   * Use the official image: `ghcr.io/xixu-me/xget:latest`
   * Or mirror/rebuild Xget into DOCR if you want a private registry or faster internal pulls.

2. **Create an App**

   In the DigitalOcean control panel:

   * Create new App → choose "Container".
   * Source:

     * DigitalOcean Container Registry *or*
     * an external image (`ghcr.io/xixu-me/xget:latest`).
   * Set the internal listening port to `8080`.

3. **Configure routing**

   * Map external path `/` to the Xget service.
   * Bind your domain (e.g. `xget.example.com`) to the app and enable automatic HTTPS.

4. **Scaling**

   * In the Scaling section, set minimum number of instances, e.g. 2 replicas for high availability.
   * Configure autoscaling based on CPU / memory usage.

### 3.2 Pros and caveats

* **Pros**

  * No OS or Docker maintenance.
  * Built-in TLS / certificate management.
  * Simple scaling and deployment UX.

* **Caveats**

  * Xget is sensitive to large download traffic: you should monitor bandwidth and outbound data transfer costs.
  * For advanced network control (VPC-only access, strict firewall rules), combine App Platform with Cloud Firewall and VPC.

## 4. Option 3: DigitalOcean Kubernetes (DOKS)

When you need multiple replicas, blue-green deployments, or fine-grained rollout strategies, run Xget on DOKS as a standard `Deployment`.

### 4.1 Example Deployment & Service

> Note: the health check path below uses `/`. If your build of Xget exposes a dedicated health endpoint, adjust accordingly.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: xget
spec:
  replicas: 2
  selector:
    matchLabels:
      app: xget
  template:
    metadata:
      labels:
        app: xget
    spec:
      containers:
        - name: xget
          image: ghcr.io/xixu-me/xget:latest
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: "250m"
              memory: "256Mi"
            limits:
              cpu: "1"
              memory: "512Mi"
          readinessProbe:
            httpGet:
              path: /
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 30
---
apiVersion: v1
kind: Service
metadata:
  name: xget
spec:
  selector:
    app: xget
  ports:
    - port: 80
      targetPort: 8080
  type: LoadBalancer
```

* `type: LoadBalancer` will automatically create a DigitalOcean Load Balancer and assign a public IP.
* Point `xget.example.com` to the Load Balancer IP in your DNS.

If you are using an Ingress Controller (nginx Ingress, Traefik, etc.), you can change the service type to `ClusterIP` and configure Ingress + cert-manager for Let’s Encrypt.

## 5. Using DOCR + Xget as an image accelerator

Xget can act as a registry accelerator for multiple container registries, including DigitalOcean Container Registry (DOCR). The typical pattern is:

* Original: `https://registry.digitalocean.com/...`
* Through Xget: `https://<your Xget domain>/cr/digitalocean/...`

### 5.1 Example: accelerate DOCR pulls

Suppose your DOCR image is:

```text
registry.digitalocean.com/my-registry/my-image:latest
```

You can convert it to:

```text
https://xget.example.com/cr/digitalocean/my-registry/my-image:latest
```

This is especially useful for scripting, diagnostic, or advanced caching setups around DOCR.

### 5.2 Using Xget as a pull accelerator (daemon.json idea)

In some environments you can configure Docker / containerd to use Xget as a registry mirror. For example, in `/etc/docker/daemon.json`:

```json
{
  "registry-mirrors": [
    "https://xget.example.com/cr/digitalocean"
  ]
}
```

> Note: Support for non–Docker Hub mirrors depends on the Docker/containerd version and configuration. Treat this as a pattern; always verify behavior in your own environment.

## 6. Using Xget on DigitalOcean to accelerate AI inference and dev dependencies

Xget also supports API acceleration for multiple AI inference providers (e.g., OpenAI, Anthropic, Gemini) through URL conversions such as `ip/<provider>`.

Once Xget is deployed on DigitalOcean, simply replace the public demo domain in examples with your own domain:

```env
# .env example
OPENAI_BASE_URL=https://xget.example.com/ip/openai
ANTHROPIC_BASE_URL=https://xget.example.com/ip/anthropic
GEMINI_BASE_URL=https://xget.example.com/ip/gemini
```

Then in your code (Python + OpenAI SDK):

```python
import os
from openai import OpenAI

client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY"),
    base_url=os.getenv("OPENAI_BASE_URL"),
)
```

If your CI/CD pipelines or backend services also run on DigitalOcean (Droplets, App Platform, DOKS), they can access Xget very close in network topology, reducing latency and cross-region hops.

## 7. Monitoring, logging, and cost optimization

1. **Monitoring**

   * **Droplet**: Install the DigitalOcean Monitoring Agent to track CPU, memory, and bandwidth.
   * **App Platform / DOKS**: Use the built-in metrics views and alerts.
   * At the application level, you can inspect Xget’s response headers (e.g., performance metrics) to understand cache hits and upstream delays if Xget exposes such information in your setup.

2. **Logging**

   * Use `docker logs` or `kubectl logs` to inspect Xget container logs.
   * Aggregate nginx / Ingress logs plus Xget logs into a centralized stack (ELK, Loki, etc.) for easier debugging.

3. **Cost optimization**

   * Start with a smaller Droplet or the lowest App Platform plan, then scale based on real traffic.
   * For very high outbound traffic, focus on:

     * Improving cache hit ratio.
     * Avoiding redundant upstream requests.
   * Choose regions that balance:

     * End-user latency.
     * Upstream connectivity quality (e.g., to GitHub, DOCR, AI providers).

## 8. Security and abuse prevention

Because Xget is fundamentally a high-performance HTTP / Git / container registry proxy, you need to be careful about abuse:

* Do not expose a completely open, unauthenticated Xget service to the entire public Internet if you don’t fully understand the risk.
* Recommended mitigations:

  * Restrict access to trusted IP ranges (office network, VPN, CI/CD nodes).
  * Add authentication at the reverse proxy or gateway layer (e.g., Basic Auth, token-based, or JWT).
  * Configure reasonable timeouts and concurrency limits to reduce the impact of misuse and protect upstreams.

With these patterns, you can deploy Xget on DigitalOcean using Droplets, App Platform, or Kubernetes, and combine it with DOCR, DNS, and firewalls to build a unified, robust acceleration layer for repositories, container images, and AI inference traffic.
