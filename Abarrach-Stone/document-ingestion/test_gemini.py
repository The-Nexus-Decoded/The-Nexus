#!/usr/bin/env python3
"""Test Gemini extraction on a sample document."""
import os
import requests
import json

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

content = """Ola Lawal
Minneapolis, MN 55444
ola_Lawal@Yahoo.COM
(612) 615-4570

Dear Hiring Manager,
I am writing to express my strong interest in the C#.NET Software Engineer position at WebstaurantStore. With over a decade of experience architecting and developing enterprise-scale .NET applications."""

prompt = f"""Extract structured information from this resume.
Return a JSON array only: [{{"type": "identity|skills|employment", "key": "field_name", "value": "extracted_value"}}]
Only extract: name, email, phone, skills, employer, job_title.
Return only valid JSON, no explanation."""

response = requests.post(
    f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}",
    json={"contents": [{"parts": [{"text": prompt}]}]},
    timeout=30
)

print(f"Status: {response.status_code}")
if response.status_code == 200:
    text = response.json()["candidates"][0]["content"]["parts"][0]["text"]
    print(f"Response: {text[:500]}")
else:
    print(f"Error: {response.text}")
