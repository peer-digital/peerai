"""
Script to update existing app templates with dark icon URLs.
"""
from backend.database import SessionLocal
from backend.models.app_templates import AppTemplate

def update_template_icons():
    """Update existing app templates with dark icon URLs."""
    db = SessionLocal()
    try:
        templates = db.query(AppTemplate).all()
        updated_count = 0
        
        for template in templates:
            if template.icon_url and not template.dark_icon_url:
                if 'placeholder' in template.icon_url:
                    # For placeholder images, add dark mode parameters
                    if '?' in template.icon_url:
                        template.dark_icon_url = template.icon_url.replace('?', '?bg=333333&fg=FFFFFF&')
                    else:
                        template.dark_icon_url = f"{template.icon_url}?bg=333333&fg=FFFFFF"
                else:
                    # For other images, just copy the light mode URL
                    template.dark_icon_url = template.icon_url
                
                updated_count += 1
        
        if updated_count > 0:
            db.commit()
            print(f"✅ Successfully updated {updated_count} templates with dark icon URLs.")
        else:
            print("ℹ️ No templates needed updating.")
            
    except Exception as e:
        db.rollback()
        print(f"❌ Error updating templates: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    update_template_icons()
