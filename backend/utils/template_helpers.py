"""
Helper functions for working with app templates
"""
from typing import Dict, Any


def flatten_object(obj: Dict[str, Any], prefix: str = '') -> Dict[str, Any]:
    """
    Flattens a nested object structure into a flat object with dot notation keys
    Example: { a: { b: 1 } } becomes { 'a.b': 1 }
    
    Args:
        obj: The object to flatten
        prefix: The prefix to use for keys (used in recursion)
        
    Returns:
        A flattened object
    """
    result = {}
    for key, value in obj.items():
        pre = f"{prefix}.{key}" if prefix else key
        if isinstance(value, dict):
            result.update(flatten_object(value, pre))
        else:
            result[pre] = value
    return result


def replace_placeholders(template: str, config: Dict[str, Any]) -> str:
    """
    Replaces placeholders in a template string with values from a configuration object
    Handles both flat and nested objects by flattening the configuration first
    
    Args:
        template: The template string with {{placeholder}} syntax
        config: The configuration object with values to replace placeholders
        
    Returns:
        The template with placeholders replaced
    """
    # First handle nested objects by flattening them
    flat_config = flatten_object(config)
    
    # Then replace all placeholders in the template
    result = template
    
    # First replace nested object references (e.g., {{app_settings.app_title}})
    for key, value in flat_config.items():
        placeholder = f"{{{{{key}}}}}"
        result = result.replace(placeholder, str(value))
    
    # Then replace any remaining direct references (e.g., {{app_title}})
    # This is for backward compatibility with templates that don't use nested references
    for key, value in config.items():
        if not isinstance(value, dict):
            placeholder = f"{{{{{key}}}}}"
            result = result.replace(placeholder, str(value))
    
    return result
