#!/usr/bin/env python3
"""Seedream 4.5 (ByteDance 即梦) image generation via volcengine ARK API."""

import argparse
import base64
import json
import os
import sys
from datetime import datetime, timezone
from urllib.request import Request, urlopen
from urllib.error import HTTPError


def main():
    parser = argparse.ArgumentParser(description="Seedream 4.5 image generation")
    parser.add_argument("--prompt", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--api-key", default=os.environ.get("SEEDREAM_API_KEY", ""))
    parser.add_argument("--size", default="1024x1536")
    parser.add_argument("--negative-prompt", default="")
    args = parser.parse_args()

    if not args.api_key:
        print("Error: --api-key required or set SEEDREAM_API_KEY env var")
        sys.exit(1)

    endpoint = "https://ark.cn-beijing.volces.com/api/v3/images/generations"
    payload = {
        "model": "doubao-seedream-4-5-251128",
        "prompt": args.prompt,
        "size": args.size,
        "n": 1,
        "response_format": "b64_json",
    }
    if args.negative_prompt:
        payload["negative_prompt"] = args.negative_prompt

    req = Request(
        endpoint,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {args.api_key}",
        },
    )

    try:
        resp = urlopen(req, timeout=120)
        data = json.loads(resp.read())
    except HTTPError as e:
        body = e.read().decode()
        print(f"API error {e.code}: {body}")
        sys.exit(1)

    images = data.get("data", [])
    if not images:
        print(f"Unexpected response: {json.dumps(data, indent=2)}")
        sys.exit(1)

    os.makedirs(os.path.dirname(args.output) or ".", exist_ok=True)
    with open(args.output, "wb") as f:
        f.write(base64.b64decode(images[0]["b64_json"]))

    print(f"Saved: {args.output}")


if __name__ == "__main__":
    main()
