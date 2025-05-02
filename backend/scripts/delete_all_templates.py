#!/usr/bin/env python
"""
Script to delete all app templates from the database.

This script provides options to:
1. Delete all templates (if no deployments exist)
2. Force delete templates (by first deleting any associated deployments)
3. Perform a dry run (just show what would be deleted without actually deleting)

Usage:
    python -m backend.scripts.delete_all_templates [--force] [--dry-run]

Arguments:
    --force: Force delete templates by first deleting any associated deployments
    --dry-run: Show what would be deleted without actually deleting anything
"""
import os
import sys
import argparse
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

# Add the parent directory to the path so we can import backend modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.database import SessionLocal
from backend.models.app_templates import AppTemplate
from backend.models.deployed_apps import DeployedApp


def delete_all_templates(force=False, dry_run=False):
    """
    Delete all app templates from the database.

    Args:
        force: If True, delete any deployments using the templates first.
        dry_run: If True, only show what would be deleted without actually deleting.
    """
    db = SessionLocal()

    try:
        # Get all templates
        templates = db.query(AppTemplate).all()
        template_count = len(templates)

        if template_count == 0:
            print("No templates found in the database.")
            return

        print(f"Found {template_count} templates in the database.")

        # Check for deployments
        templates_with_deployments = []
        for template in templates:
            deployment_count = db.query(DeployedApp).filter(
                DeployedApp.template_id == template.id
            ).count()
            
            if deployment_count > 0:
                templates_with_deployments.append((template, deployment_count))

        if templates_with_deployments:
            print(f"\nWARNING: {len(templates_with_deployments)} templates have active deployments:")
            for template, count in templates_with_deployments:
                print(f"  - {template.name} (ID: {template.id}, slug: {template.slug}): {count} deployments")
            
            if not force and not dry_run:
                print("\nCannot delete templates with active deployments. Use --force to delete deployments first.")
                return

        # If dry run, stop here
        if dry_run:
            print("\nDRY RUN: The following templates would be deleted:")
            for template in templates:
                print(f"  - {template.name} (ID: {template.id}, slug: {template.slug})")
            
            if force and templates_with_deployments:
                print("\nThe following deployments would also be deleted:")
                for template, count in templates_with_deployments:
                    print(f"  - All deployments of {template.name} (ID: {template.id}, slug: {template.slug})")
            
            return

        # Delete deployments if force is True
        if force and templates_with_deployments:
            print("\nDeleting deployments...")
            for template, _ in templates_with_deployments:
                deployments = db.query(DeployedApp).filter(
                    DeployedApp.template_id == template.id
                ).all()
                
                for deployment in deployments:
                    print(f"  - Deleting deployment: {deployment.name} (ID: {deployment.id}, slug: {deployment.slug})")
                    db.delete(deployment)
            
            db.commit()
            print("All deployments deleted successfully.")

        # Delete all templates
        print("\nDeleting templates...")
        for template in templates:
            print(f"  - Deleting template: {template.name} (ID: {template.id}, slug: {template.slug})")
            db.delete(template)
        
        db.commit()
        print(f"Successfully deleted {template_count} templates from the database.")

    except IntegrityError as e:
        db.rollback()
        print(f"\nError: Database integrity constraint violated: {e}")
        print("This might be due to foreign key constraints. Use --force to delete related records first.")
    except Exception as e:
        db.rollback()
        print(f"\nError: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Delete all app templates from the database")
    parser.add_argument(
        "--force",
        action="store_true",
        help="Force delete templates by first deleting any associated deployments",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be deleted without actually deleting anything",
    )
    args = parser.parse_args()

    delete_all_templates(force=args.force, dry_run=args.dry_run)
