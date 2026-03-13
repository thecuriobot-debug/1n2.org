#!/bin/bash
# Verify and fix SSH key on server
# Run this in the DigitalOcean console

echo "=== Checking authorized_keys ==="
cat ~/.ssh/authorized_keys

echo ""
echo "=== File permissions ==="
ls -la ~/.ssh/

echo ""
echo "=== SSH directory permissions ==="
ls -ld ~/.ssh

echo ""
echo "=== Fixing permissions if needed ==="
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys

echo ""
echo "=== Verifying key is present ==="
grep "thecuriobot@github.com" ~/.ssh/authorized_keys && echo "✅ Key found!" || echo "❌ Key NOT found!"
