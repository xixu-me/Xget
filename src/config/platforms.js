/**
 * Configuration object for different platform URLs and path transformations
 * @type {Object.<string, {base: string, transform: function(string): string}>}
 */
export const PLATFORMS = {
	/** @type {{base: string, transform: function(string): string}} GitHub configuration */
	gh: {
		base: 'https://raw.githubusercontent.com',
		transform: (path) => path.replace(/^\/gh\//, '/'),
	},
	/** @type {{base: string, transform: function(string): string}} GitLab configuration */
	gl: {
		base: 'https://gitlab.com',
		transform: (path) => path.replace(/^\/gl\//, '/') + '/raw',
	},
	/** @type {{base: string, transform: function(string): string}} HuggingFace configuration */
	hf: {
		base: 'https://huggingface.co',
		transform: (path) => path.replace(/^\/hf\//, '/'),
	},
	/** @type {{base: string, transform: function(string): string}} Kaggle configuration */
	kg: {
		base: 'https://www.kaggle.com',
		transform: (path) => path.replace(/^\/kg\//, '/'),
	},
};