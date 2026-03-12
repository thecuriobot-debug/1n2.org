#!/bin/bash
# install-dependencies.sh - Install required Python packages

echo "📦 Installing Python dependencies for Curio Atlas..."
echo ""

# Install requests library
pip3 install requests --user

if [ $? -eq 0 ]; then
    echo "✅ requests installed successfully"
else
    echo "⚠️  pip3 install failed, trying alternative..."
    python3 -m pip install requests --user
fi

echo ""
echo "✅ Dependencies installed!"
echo ""
echo "Now run the blockchain fetch:"
echo "  cd ~/Sites/1n2.org/curio-atlas/backend"
echo "  export ALCHEMY_API_KEY='vfF4rHBY1zsGgI3kqEg9v'"
echo "  python3 blockchain-fetcher.py"
