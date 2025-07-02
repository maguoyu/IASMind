#!/usr/bin/env python3
"""
Test script to verify client disconnect detection in streaming endpoints.
This script simulates a client that connects to the streaming endpoints and then disconnects.
"""

import asyncio
import aiohttp
import time
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_disconnect_detection():
    """Test client disconnect detection for streaming endpoints."""
    
    # Test endpoints
    endpoints = [
        "/api/deep_research/stream",
        "/api/chatbot/stream", 
        "/api/prose/generate"
    ]
    
    for endpoint in endpoints:
        logger.info(f"Testing disconnect detection for {endpoint}")
        
        try:
            async with aiohttp.ClientSession() as session:
                # Prepare request data based on endpoint
                if endpoint == "/api/deep_research/stream":
                    data = {
                        "messages": [{"role": "user", "content": "Test research query"}],
                        "thread_id": "test-thread",
                        "max_plan_iterations": 1,
                        "max_step_num": 2,
                        "max_search_results": 2,
                        "auto_accepted_plan": True,
                        "enable_background_investigation": True,
                        "enable_deep_thinking": False
                    }
                elif endpoint == "/api/chatbot/stream":
                    data = {
                        "messages": [{"role": "user", "content": "Hello chatbot"}],
                        "thread_id": "test-thread",
                        "resources": []
                    }
                elif endpoint == "/api/prose/generate":
                    data = {
                        "prompt": "Write a short story about a cat.",
                        "option": "continue",
                        "command": "continue"
                    }
                
                # Start streaming request
                async with session.post(
                    f"http://localhost:8000{endpoint}",
                    json=data,
                    headers={"Content-Type": "application/json"}
                ) as response:
                    
                    if response.status != 200:
                        logger.error(f"Request failed with status {response.status}")
                        continue
                    
                    logger.info(f"Stream started for {endpoint}")
                    
                    # Read a few chunks then disconnect
                    chunk_count = 0
                    async for chunk in response.content:
                        chunk_count += 1
                        logger.info(f"Received chunk {chunk_count}: {chunk.decode()[:100]}...")
                        
                        # Disconnect after receiving 3 chunks
                        if chunk_count >= 3:
                            logger.info(f"Disconnecting from {endpoint} after {chunk_count} chunks")
                            break
                    
                    logger.info(f"Disconnected from {endpoint}")
                    
        except Exception as e:
            logger.error(f"Error testing {endpoint}: {e}")
        
        # Wait between tests
        await asyncio.sleep(1)
    
    logger.info("Disconnect detection test completed")

if __name__ == "__main__":
    print("Starting client disconnect detection test...")
    print("Make sure your server is running on http://localhost:8000")
    print("This test will connect to streaming endpoints and then disconnect")
    print("Check your server logs for disconnect detection messages")
    print()
    
    asyncio.run(test_disconnect_detection()) 