#!/usr/bin/env python3
"""
face_verify.py — Local face verification bridge for Multi-Search.
Uses DeepFace to detect faces and compare face similarity.
Called by faceVerification.js via child_process.

Usage:
  python3 face_verify.py detect <image_path_or_url>
  python3 face_verify.py verify <anchor_path> <candidate_path>

Output: JSON to stdout
"""

import sys
import json
import os
import tempfile
import urllib.request
import ssl

# Suppress TensorFlow warnings
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'

import warnings
warnings.filterwarnings('ignore')

from deepface import DeepFace


def download_image(url):
    """Download an image URL to a temp file, return the path."""
    if not url or not url.startswith(('http://', 'https://')):
        return url  # Assume local path

    try:
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE

        req = urllib.request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'image/*,*/*;q=0.8'
        })
        suffix = '.jpg'
        if '.png' in url.lower():
            suffix = '.png'

        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
        with urllib.request.urlopen(req, timeout=15, context=ctx) as resp:
            tmp.write(resp.read())
        tmp.close()
        return tmp.name
    except Exception as e:
        print(json.dumps({"error": f"Download failed: {str(e)}"}), file=sys.stderr)
        return None


def cleanup_temp(path, original):
    """Remove temp file if we created one."""
    if path and path != original and os.path.exists(path):
        try:
            os.unlink(path)
        except:
            pass


def detect_face(image_source):
    """Detect if a human face exists in the image."""
    local_path = download_image(image_source)
    if not local_path:
        return {"hasHumanFace": False, "confidence": 0, "error": "Could not download image"}

    try:
        faces = DeepFace.extract_faces(
            img_path=local_path,
            detector_backend='opencv',
            enforce_detection=False,
            align=False
        )

        has_face = False
        best_confidence = 0

        for face in faces:
            conf = face.get('confidence', 0)
            if conf > 0.5:  # At least 50% detection confidence
                has_face = True
                best_confidence = max(best_confidence, conf * 100)

        return {
            "hasHumanFace": has_face,
            "confidence": round(best_confidence, 1)
        }
    except Exception as e:
        return {"hasHumanFace": False, "confidence": 0, "error": str(e)}
    finally:
        cleanup_temp(local_path, image_source)


def verify_faces(anchor_source, candidate_source):
    """Compare two faces and return similarity score (0-100)."""
    anchor_path = download_image(anchor_source)
    candidate_path = download_image(candidate_source)

    if not anchor_path or not candidate_path:
        return {"isSamePerson": False, "confidence": 0, "error": "Could not download one or both images"}

    try:
        result = DeepFace.verify(
            img1_path=anchor_path,
            img2_path=candidate_path,
            model_name='VGG-Face',
            detector_backend='opencv',
            enforce_detection=False,
            distance_metric='cosine'
        )

        # Convert cosine distance to similarity percentage
        # Cosine distance: 0 = identical, ~0.4 = threshold, 1 = completely different
        distance = result.get('distance', 1.0)
        threshold = result.get('threshold', 0.4)
        verified = result.get('verified', False)

        # Map distance to 0-100 scale
        # distance 0 -> score 100, distance >= threshold*2 -> score 0
        max_distance = threshold * 2
        similarity = max(0, min(100, (1 - distance / max_distance) * 100))

        return {
            "isSamePerson": verified,
            "confidence": round(similarity, 1),
            "distance": round(distance, 4),
            "threshold": round(threshold, 4)
        }
    except Exception as e:
        return {"isSamePerson": False, "confidence": 0, "error": str(e)}
    finally:
        cleanup_temp(anchor_path, anchor_source)
        cleanup_temp(candidate_path, candidate_source)


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: face_verify.py <detect|verify> <args...>"}))
        sys.exit(1)

    command = sys.argv[1]

    if command == 'detect':
        if len(sys.argv) < 3:
            print(json.dumps({"error": "detect requires an image path/URL"}))
            sys.exit(1)
        result = detect_face(sys.argv[2])
        print(json.dumps(result))

    elif command == 'verify':
        if len(sys.argv) < 4:
            print(json.dumps({"error": "verify requires anchor and candidate paths/URLs"}))
            sys.exit(1)
        result = verify_faces(sys.argv[2], sys.argv[3])
        print(json.dumps(result))

    elif command == 'batch':
        # Read JSON from stdin for batch operations
        input_data = json.loads(sys.stdin.read())
        results = []
        for task in input_data.get('tasks', []):
            if task['type'] == 'detect':
                results.append(detect_face(task['url']))
            elif task['type'] == 'verify':
                results.append(verify_faces(task['anchor'], task['candidate']))
        print(json.dumps({"results": results}))

    else:
        print(json.dumps({"error": f"Unknown command: {command}"}))
        sys.exit(1)


if __name__ == '__main__':
    main()
