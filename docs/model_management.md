# Model Management

This document explains how model configurations are managed in the PeerAI system.

## Overview

The system uses a database-backed model registry to manage available AI models. Models can be:

- Added automatically via the `seed_mistral_models.py` script
- Managed through the admin dashboard's Model Management interface
- Configured to have specific default statuses via configuration files

## Model Configuration Persistence

Model configurations (especially the `status` field that controls whether a model is active) are preserved across deployments. The system is designed to:

1. Only seed models on first deployment when the database is empty
2. Preserve manual configuration changes made through the admin interface
3. Allow for configuration of specific models that should always be active or inactive

## Configuration Files

### `backend/config/model_defaults.py`

This file controls which models should be active by default:

```python
# List of models that should always be active
ALWAYS_ACTIVE_MODELS = [
    "mistral-large",
    "mistral-medium", 
    "mistral-tiny",
    "open-mistral-nemo-2407",
    "pixtral-large-2411"
]

# List of models that should always be inactive
ALWAYS_INACTIVE_MODELS = [
    # Add any models that should always be inactive here
]

# Default status for new models not in either list above
DEFAULT_NEW_MODEL_STATUS = "inactive"
```

## Manual Model Management

### Using the Admin Dashboard

1. Log in to the admin dashboard
2. Navigate to the Model Management page
3. Edit models individually or use the bulk edit feature
4. Change the status to "active" or "inactive" as needed

### Using the Seeding Script

To manually update models while preserving configurations:

```bash
# Run from the project root
python -m backend.scripts.seed_mistral_models
```

This script will:
- Fetch available models from the Mistral API
- Add any new models that don't exist in the database
- Update model display names and configurations
- Set statuses according to the rules in `model_defaults.py`
- Preserve existing statuses for models not explicitly configured

## Deployment Behavior

During deployment:

1. The system checks if any models exist in the database
2. If no models exist, it runs the seeding script to populate the database
3. If models already exist, it skips the seeding script to preserve configurations

To force a model update during deployment, you can manually run:

```bash
# On the server
cd /home/ubuntu/peer-ai
.venv/bin/python -m backend.scripts.seed_mistral_models
```

## Troubleshooting

If model configurations are being reset:

1. Check that the `check_models_exist.py` script is working correctly
2. Verify that the `model_defaults.py` file has the correct configuration
3. Check the deployment logs to see if the seeding script is being run unexpectedly
