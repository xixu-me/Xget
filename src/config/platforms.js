/**
 * Configuration object for different platform base URLs
 * @type {Object.<string, string>}
 */
export const PLATFORMS = {
  gh: 'https://github.com',
  gist: 'https://gist.github.com',
  gl: 'https://gitlab.com',
  gitea: 'https://gitea.com',
  codeberg: 'https://codeberg.org',
  sf: 'https://sourceforge.net',
  aosp: 'https://android.googlesource.com',
  hf: 'https://huggingface.co',
  civitai: 'https://civitai.com',
  npm: 'https://registry.npmjs.org',
  pypi: 'https://pypi.org',
  'pypi-files': 'https://files.pythonhosted.org',
  conda: 'https://repo.anaconda.com',
  'conda-community': 'https://conda.anaconda.org',
  maven: 'https://repo1.maven.org',
  apache: 'https://downloads.apache.org',
  gradle: 'https://plugins.gradle.org',
  homebrew: 'https://github.com/Homebrew',
  'homebrew-api': 'https://formulae.brew.sh/api',
  'homebrew-bottles': 'https://ghcr.io',
  rubygems: 'https://rubygems.org',
  cran: 'https://cran.r-project.org',
  cpan: 'https://www.cpan.org',
  ctan: 'https://tug.ctan.org',
  golang: 'https://proxy.golang.org',
  nuget: 'https://api.nuget.org',
  crates: 'https://crates.io',
  packagist: 'https://repo.packagist.org',
  debian: 'https://deb.debian.org',
  ubuntu: 'https://archive.ubuntu.com',
  fedora: 'https://dl.fedoraproject.org',
  rocky: 'https://download.rockylinux.org',
  opensuse: 'https://download.opensuse.org',
  arch: 'https://geo.mirror.pkgbuild.com',
  arxiv: 'https://arxiv.org',
  fdroid: 'https://f-droid.org',
  jenkins: 'https://updates.jenkins.io',

  // AI Inference Providers
  'ip-openai': 'https://api.openai.com',
  'ip-anthropic': 'https://api.anthropic.com',
  'ip-gemini': 'https://generativelanguage.googleapis.com',
  'ip-vertexai': 'https://aiplatform.googleapis.com',
  'ip-cohere': 'https://api.cohere.ai',
  'ip-mistralai': 'https://api.mistral.ai',
  'ip-xai': 'https://api.x.ai',
  'ip-githubmodels': 'https://models.github.ai',
  'ip-nvidiaapi': 'https://integrate.api.nvidia.com',
  'ip-perplexity': 'https://api.perplexity.ai',
  'ip-braintrust': 'https://api.braintrust.dev',
  'ip-groq': 'https://api.groq.com',
  'ip-cerebras': 'https://api.cerebras.ai',
  'ip-sambanova': 'https://api.sambanova.ai',
  'ip-siray': 'https://api.siray.ai',
  'ip-huggingface': 'https://router.huggingface.co',
  'ip-together': 'https://api.together.xyz',
  'ip-replicate': 'https://api.replicate.com',
  'ip-fireworks': 'https://api.fireworks.ai',
  'ip-nebius': 'https://api.studio.nebius.ai',
  'ip-jina': 'https://api.jina.ai',
  'ip-voyageai': 'https://api.voyageai.com',
  'ip-falai': 'https://fal.run',
  'ip-novita': 'https://api.novita.ai',
  'ip-burncloud': 'https://ai.burncloud.com',
  'ip-openrouter': 'https://openrouter.ai',
  'ip-poe': 'https://api.poe.com',
  'ip-featherlessai': 'https://api.featherless.ai',
  'ip-hyperbolic': 'https://api.hyperbolic.xyz',

  // Container Registries
  'cr-docker': 'https://registry-1.docker.io',
  'cr-quay': 'https://quay.io',
  'cr-gcr': 'https://gcr.io',
  'cr-mcr': 'https://mcr.microsoft.com',
  'cr-ecr': 'https://public.ecr.aws',
  'cr-ghcr': 'https://ghcr.io',
  'cr-gitlab': 'https://registry.gitlab.com',
  'cr-redhat': 'https://registry.redhat.io',
  'cr-oracle': 'https://container-registry.oracle.com',
  'cr-cloudsmith': 'https://docker.cloudsmith.io',
  'cr-digitalocean': 'https://registry.digitalocean.com',
  'cr-vmware': 'https://projects.registry.vmware.com',
  'cr-k8s': 'https://registry.k8s.io',
  'cr-heroku': 'https://registry.heroku.com',
  'cr-suse': 'https://registry.suse.com',
  'cr-opensuse': 'https://registry.opensuse.org',
  'cr-gitpod': 'https://registry.gitpod.io'
};

/**
 * Unified path transformation function
 * @param {string} path - The original path
 * @param {string} platformKey - The platform key
 * @returns {string} - The transformed path
 */
export function transformPath(path, platformKey) {
  if (!PLATFORMS[platformKey]) {
    return path;
  }

  const prefix = `/${platformKey.replace(/-/g, '/')}/`;
  let transformedPath = path.replace(
    new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`),
    '/'
  );

  // Special handling for crates.io API paths
  if (platformKey === 'crates') {
    // Transform paths to include the API prefix
    if (transformedPath.startsWith('/')) {
      // Handle different API endpoints:
      // /serde/1.0.0/download -> /api/v1/crates/serde/1.0.0/download
      // /serde -> /api/v1/crates/serde
      // /?q=query -> /api/v1/crates?q=query
      if (transformedPath === '/' || transformedPath.startsWith('/?')) {
        // Search endpoint
        transformedPath = transformedPath.replace('/', '/api/v1/crates');
      } else {
        // Crate-specific endpoints
        transformedPath = `/api/v1/crates${transformedPath}`;
      }
    }
  }

  // Special handling for Homebrew API paths
  if (platformKey === 'homebrew-api') {
    // Transform paths for Homebrew API endpoints
    if (transformedPath.startsWith('/')) {
      // Handle different API endpoints:
      // /formula/git.json -> /formula/git.json
      // /cask/docker.json -> /cask/docker.json
      // Keep the API paths as-is since they're already correct
      return transformedPath;
    }
  }

  // Special handling for Homebrew bottles
  if (platformKey === 'homebrew-bottles') {
    // Transform paths for Homebrew bottles
    if (transformedPath.startsWith('/')) {
      // Transform bottle paths to ghcr.io container registry format
      // /v2/homebrew/core/git/manifests/2.39.0 -> /v2/homebrew/core/git/manifests/2.39.0
      return transformedPath;
    }
  }

  // Special handling for Jenkins plugins
  if (platformKey === 'jenkins') {
    // Transform paths for Jenkins update center and plugin downloads
    if (transformedPath.startsWith('/')) {
      // Handle different Jenkins endpoints:
      // /update-center.json -> /current/update-center.json
      // /update-center.actual.json -> /current/update-center.actual.json
      // /experimental/update-center.json -> /experimental/update-center.json
      // /download/plugins/... -> /download/plugins/...

      if (transformedPath === '/update-center.json') {
        return '/current/update-center.json';
      } else if (transformedPath === '/update-center.actual.json') {
        return '/current/update-center.actual.json';
      } else if (
        transformedPath.startsWith('/experimental/') ||
        transformedPath.startsWith('/download/') ||
        transformedPath.startsWith('/current/')
      ) {
        // Keep experimental, download, and current paths as-is
        return transformedPath;
      } else {
        // For other paths, assume they are relative to current
        return `/current${transformedPath}`;
      }
    }
  }

  // Special handling for Homebrew repositories
  if (platformKey === 'homebrew') {
    // Transform paths for Homebrew Git repositories
    if (transformedPath.startsWith('/')) {
      // Handle different repository endpoints:
      // /brew -> /brew
      // /homebrew-core -> /homebrew-core
      // /homebrew-cask -> /homebrew-cask
      return transformedPath;
    }
  }

  return transformedPath;
}
