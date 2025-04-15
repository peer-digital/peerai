"""
Configuration for default model settings.
This file controls which models should be active by default and other model-specific settings.
"""

# List of models that should always be active
# These models will not be deactivated by the seed_mistral_models script
ALWAYS_ACTIVE_MODELS = [
    "mistral-large",
    "mistral-medium",
    "mistral-tiny",
    "open-mistral-nemo-2407",
    "pixtral-large-2411"
]

# List of models that should always be inactive
# These models will be set to inactive by the seed_mistral_models script
ALWAYS_INACTIVE_MODELS = [
    # Add any models that should always be inactive here
]

# Default status for new models not in either list above
DEFAULT_NEW_MODEL_STATUS = "inactive"
