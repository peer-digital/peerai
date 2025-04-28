/**
 * Helper functions for working with app templates
 */

/**
 * Flattens a nested object structure into a flat object with dot notation keys
 * Example: { a: { b: 1 } } becomes { 'a.b': 1 }
 * 
 * @param obj The object to flatten
 * @param prefix The prefix to use for keys (used in recursion)
 * @returns A flattened object
 */
export function flattenObject(obj: Record<string, any>, prefix = ''): Record<string, any> {
  return Object.keys(obj).reduce((acc: Record<string, any>, k: string) => {
    const pre = prefix.length ? `${prefix}.` : '';
    if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
      Object.assign(acc, flattenObject(obj[k], pre + k));
    } else {
      acc[pre + k] = obj[k];
    }
    return acc;
  }, {});
}

/**
 * Replaces placeholders in a template string with values from a configuration object
 * Handles both flat and nested objects by flattening the configuration first
 * 
 * @param template The template string with {{placeholder}} syntax
 * @param config The configuration object with values to replace placeholders
 * @returns The template with placeholders replaced
 */
export function replacePlaceholders(template: string, config: Record<string, any>): string {
  // First handle nested objects by flattening them
  const flatConfig = flattenObject(config);
  
  // Then replace all placeholders in the template
  let result = template;
  
  // First replace nested object references (e.g., {{app_settings.app_title}})
  Object.entries(flatConfig).forEach(([key, value]) => {
    const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(placeholder, String(value));
  });
  
  // Then replace any remaining direct references (e.g., {{app_title}})
  // This is for backward compatibility with templates that don't use nested references
  Object.entries(config).forEach(([key, value]) => {
    if (typeof value !== 'object' || value === null) {
      const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(placeholder, String(value));
    }
  });
  
  return result;
}
