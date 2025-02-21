from locust import HttpUser, task, between
import json
import random

class PeerAIUser(HttpUser):
    # Wait between 1 and 5 seconds between tasks
    wait_time = between(1, 5)
    
    def on_start(self):
        """Setup test API key"""
        # Note: Use a test API key with high rate limits for load testing
        self.api_key = "test_key_123"
        self.headers = {"X-API-Key": self.api_key}
        
        # Test data for different modalities
        self.text_prompts = [
            "Explain the concept of machine learning in simple terms",
            "What are the key differences between supervised and unsupervised learning?",
            "How does deep learning relate to artificial intelligence?",
            "Describe the role of neural networks in modern AI",
            "What are the ethical considerations in AI development?"
        ]
        
        self.image_urls = [
            "https://example.com/test-images/technical-diagram-1.jpg",
            "https://example.com/test-images/office-workspace.jpg",
            "https://example.com/test-images/team-meeting.jpg"
        ]
        
        self.image_prompts = [
            "Describe the main elements in this technical diagram",
            "What can you tell me about this workspace setup?",
            "Analyze the team dynamics visible in this image"
        ]
        
        self.audio_urls = [
            "https://example.com/test-audio/technical-presentation.mp3",
            "https://example.com/test-audio/team-discussion.wav"
        ]
    
    @task(3)
    def test_text_completion(self):
        """Test the text completion endpoint"""
        prompt = random.choice(self.text_prompts)
        payload = {
            "prompt": prompt,
            "max_tokens": 100,
            "temperature": 0.7,
            "mock_mode": True
        }
        
        with self.client.post(
            "/api/v1/completions",
            headers=self.headers,
            json=payload,
            catch_response=True
        ) as response:
            if response.status_code == 200:
                response.success()
            elif response.status_code == 429:
                response.success()
            else:
                response.failure(f"Failed with status code: {response.status_code}")
    
    @task(2)
    def test_vision_analysis(self):
        """Test the vision analysis endpoint"""
        image_url = random.choice(self.image_urls)
        prompt = random.choice(self.image_prompts)
        payload = {
            "image_url": image_url,
            "prompt": prompt,
            "max_tokens": 150,
            "mock_mode": True
        }
        
        with self.client.post(
            "/api/v1/vision",
            headers=self.headers,
            json=payload,
            catch_response=True
        ) as response:
            if response.status_code == 200:
                response.success()
            elif response.status_code == 429:
                response.success()
            else:
                response.failure(f"Failed with status code: {response.status_code}")
    
    @task(1)
    def test_audio_processing(self):
        """Test the audio processing endpoint"""
        audio_url = random.choice(self.audio_urls)
        task = random.choice(["transcribe", "analyze"])
        payload = {
            "audio_url": audio_url,
            "task": task,
            "language": "en",
            "mock_mode": True
        }
        
        with self.client.post(
            "/api/v1/audio",
            headers=self.headers,
            json=payload,
            catch_response=True
        ) as response:
            if response.status_code == 200:
                response.success()
            elif response.status_code == 429:
                response.success()
            else:
                response.failure(f"Failed with status code: {response.status_code}")
    
    @task(4)
    def test_health_check(self):
        """Test the health check endpoint"""
        with self.client.get("/health", catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Health check failed: {response.status_code}")

# To run:
# locust -f locustfile.py --host=http://localhost:8000
# Then visit http://localhost:8089 to start the test 