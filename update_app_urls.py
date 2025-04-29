from backend.database import SessionLocal
from backend.models.deployed_apps import DeployedApp
from backend.config import settings

def update_app_urls():
    db = SessionLocal()
    try:
        apps = db.query(DeployedApp).all()
        print(f'Found {len(apps)} deployed apps')
        
        updated_count = 0
        for app in apps:
            print(f'App: {app.name}, Current URL: {app.public_url}')
            
            # Check if URL needs to be updated (contains backend port 8000)
            if app.public_url and ':8000/apps/' in app.public_url:
                # Generate the correct URL
                base_url = settings.FE_URL.rstrip('/')
                new_url = f"{base_url}/apps/{app.slug}"
                
                print(f'  Updating URL from {app.public_url} to {new_url}')
                app.public_url = new_url
                updated_count += 1
        
        if updated_count > 0:
            print(f'Committing changes for {updated_count} apps')
            db.commit()
            print('Changes committed successfully')
        else:
            print('No apps needed URL updates')
            
    finally:
        db.close()

if __name__ == '__main__':
    update_app_urls()
