#!/usr/bin/env python3.12
"""
Bitcoin Group Transcription Script
Transcribes all 482 Bitcoin Group episodes from m4a audio to text using OpenAI Whisper.
Saves as individual .txt files and builds an index JSON.
Usage: python3.12 transcribe-all.py [--model base] [--start 1] [--end 485]
"""
import whisper
import os
import sys
import json
import time
import argparse

AUDIO_DIR = '/Users/curiobot/Sites/1n2.org/bitcoingroup-audio/audio'
TRANSCRIPT_DIR = '/Users/curiobot/Sites/1n2.org/bitcoingroup-audio/transcripts'
EPISODE_LIST = '/Users/curiobot/Sites/1n2.org/bitcoingroup-audio/episode-list.json'
INDEX_FILE = os.path.join(TRANSCRIPT_DIR, 'index.json')
LOG_FILE = '/tmp/btg-transcribe.log'

def log(msg):
    ts = time.strftime('%H:%M:%S')
    line = f"[{ts}] {msg}"
    print(line, flush=True)
    with open(LOG_FILE, 'a') as f:
        f.write(line + '\n')

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--model', default='base', help='Whisper model: tiny, base, small, medium, large')
    parser.add_argument('--start', type=int, default=1, help='Start episode number')
    parser.add_argument('--end', type=int, default=485, help='End episode number')
    parser.add_argument('--language', default='en', help='Language code')
    args = parser.parse_args()

    # Load episode list
    with open(EPISODE_LIST) as f:
        episodes = json.load(f)
    ep_lookup = {e['ep']: e for e in episodes}

    # Load or create index
    if os.path.exists(INDEX_FILE):
        with open(INDEX_FILE) as f:
            index = json.load(f)
    else:
        index = {'transcripts': {}, 'model': args.model, 'total': 0, 'completed': 0}

    log(f"=== Bitcoin Group Transcription ===")
    log(f"Model: {args.model}, Range: #{args.start}-#{args.end}")
    log(f"Loading Whisper model '{args.model}'...")
    
    model = whisper.load_model(args.model)
    log(f"Model loaded.")

    # Process episodes
    total = 0
    skipped = 0
    failed = 0
    
    for num in range(args.start, args.end + 1):
        if num not in ep_lookup:
            continue  # Skip missing episode numbers (61, 75, 243)
        
        ep = ep_lookup[num]
        padded = f"{num:03d}"
        audio_file = os.path.join(AUDIO_DIR, f"TBG-{padded}.m4a")
        txt_file = os.path.join(TRANSCRIPT_DIR, f"TBG-{padded}.txt")
        
        if not os.path.exists(audio_file):
            log(f"  #{num}: No audio file, skipping")
            continue
        
        if os.path.exists(txt_file) and os.path.getsize(txt_file) > 100:
            skipped += 1
            continue  # Already transcribed
        
        total += 1
        audio_size = os.path.getsize(audio_file) / 1e6
        log(f"[{total}] Transcribing #{num}: {ep['title'][:50]}... ({audio_size:.0f} MB)")
        
        try:
            start_time = time.time()
            result = model.transcribe(audio_file, language=args.language, verbose=False)
            elapsed = time.time() - start_time
            
            text = result['text'].strip()
            
            # Save transcript
            with open(txt_file, 'w') as f:
                f.write(f"# The Bitcoin Group #{num}\n")
                f.write(f"# {ep['title']}\n")
                f.write(f"# Date: {ep['date']}\n")
                f.write(f"# Transcribed with Whisper ({args.model})\n")
                f.write(f"# Duration: {result.get('language','en')}\n\n")
                f.write(text)
            
            word_count = len(text.split())
            log(f"  ✅ Done ({elapsed:.0f}s, {word_count:,} words)")
            
            # Update index
            index['transcripts'][str(num)] = {
                'file': f"TBG-{padded}.txt",
                'words': word_count,
                'time': round(elapsed, 1),
                'title': ep['title'],
                'date': ep['date'],
            }
            index['completed'] = len(index['transcripts'])
            index['total'] = len(episodes)
            index['model'] = args.model
            
            # Save index after each episode
            with open(INDEX_FILE, 'w') as f:
                json.dump(index, f)
                
        except Exception as e:
            log(f"  ❌ FAILED: {e}")
            failed += 1
    
    log(f"\n=== Complete ===")
    log(f"Transcribed: {total}, Skipped: {skipped}, Failed: {failed}")
    log(f"Total transcripts: {len(index['transcripts'])}")

if __name__ == '__main__':
    main()
