#!/usr/bin/env bash
set -e  # exit on error

echo "Running unit tests with coverage..."
coverage run -m pytest -q tests/
coverage report --fail-under=80  # Require 80% coverage threshold

# Return explicitly
exit $? 