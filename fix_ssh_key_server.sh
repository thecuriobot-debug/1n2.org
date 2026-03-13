#!/bin/bash
# Run this in DigitalOcean console to clean and add the key properly

echo "=== Cleaning and adding SSH key ==="

# Backup existing keys
cp ~/.ssh/authorized_keys ~/.ssh/authorized_keys.backup 2>/dev/null

# Remove duplicate keys for thecuriobot@github.com
grep -v "thecuriobot@github.com" ~/.ssh/authorized_keys > ~/.ssh/authorized_keys.tmp 2>/dev/null || touch ~/.ssh/authorized_keys.tmp

# Add the correct key once
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFI08RyEtEhjeKXQXIIDsN7v+NrZoz6p8L/fyIfVJT64 thecuriobot@github.com" >> ~/.ssh/authorized_keys.tmp

# Replace the file
mv ~/.ssh/authorized_keys.tmp ~/.ssh/authorized_keys

# Fix permissions
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys

echo ""
echo "=== Current authorized_keys content ==="
cat ~/.ssh/authorized_keys

echo ""
echo "=== Done! Key should now work. ==="
