#!/bin/bash
# Get real view counts from YouTube for all Thomas Hunt Films videos

echo "🔍 Fetching real view counts from YouTube..."
echo ""

videos=(
    "R5Gcva1QfsQ:David Lynch Tribute"
    "kpp246b2tCY:Pulp Fiction"
    "HjqsPt9U6UQ:John Wick 3"
    "pYuxe-1IHos:Jaws"
    "Wjz4EbyIFiQ:How to Fire a Player"
    "cgnyT_Hx59M:Baseball game"
    "Je0cLFxdk-Q:John Wick 2 Gun-Fu"
    "e0n2qfc8FBA:John Wick 2 thrown"
    "7Z9dyeeLKt8:John Wick 1"
    "9LkSG23GsW0:Just keep swinging"
    "abLvddIog0I:Now this is driving"
    "NAemnMNuhcQ:Jackrabbit"
    "Wmj_PMt8mto:MIDGET"
    "XdgKDqBQy00:Top Gun"
    "0Lcx03bAiOQ:California Girls"
    "aozd-EpUAII:Six Punches silent"
    "HOBOymqo-WY:Six Punches"
    "2DdamyuIwQg:Amalgamated"
    "PPsVE6JERGo:Batman Balloon"
    "c1beuePqCYk:Real Batman"
    "VeIOuWlmZrk:Same Bat Time"
    "b6QeQVKicko:Glorious Morning"
    "oOv5xh4Mah4:Next Week Batman"
    "afGFDYy8RNc:Hunt for Red October"
    "NixclLOskjc:Spaceballs"
    "jgGr15RvpiI:Star Wars"
    "TYrq1mLsPlo:Empire"
    "jTMK8McUdE0:Jedi"
    "tCu-fQPUU-4:San Andreas"
    "nhqtz1uixk0:Last Boy Scout"
    "s6aHrIyT5n0:Hear this Crowd"
    "wvsZ9d-q9FQ:Citizen Kane"
    "IQ0rpNEupfA:Nemesis"
    "5LOtf5Yq39Y:Insurrection"
    "yRhQ1ydXT6c:First Contact"
    "0gywz1PgM_I:Generations"
    "ILcCcldyB7M:Undiscovered Country"
    "6RGTyaJrbj0:Final Frontier"
    "n0WnsAwsG8s:Voyage Home"
    "iHMXrxXCfWs:Search for Spock"
    "3EQ9cFey-3U:Wrath of Khan"
    "afMDkTUJhMo:Motion Picture"
)

for video in "${videos[@]}"; do
    IFS=':' read -r id title <<< "$video"
    
    # Get view count
    views=$(curl -s "https://www.youtube.com/watch?v=$id" | grep -o '"viewCount":"[0-9]*"' | head -1 | grep -o '[0-9]*')
    
    if [ -n "$views" ]; then
        # Format with commas
        formatted=$(printf "%'d" "$views")
        echo "$title: $formatted views (ID: $id)"
    else
        echo "$title: FAILED (ID: $id)"
    fi
    
    sleep 0.5  # Be nice to YouTube
done

echo ""
echo "✅ Done!"
