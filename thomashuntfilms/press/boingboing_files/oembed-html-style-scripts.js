function oEmbedManagerVideoLoader(id){
  var oEmbedManagerEmbedElem = document.getElementById(id+'-raw');
  if(oEmbedManagerEmbedElem.value){
    oEmbedManagerEmbed = oEmbedManagerEmbedElem.value;
    console.log(oEmbedManagerEmbed)
  }
  else{
    oEmbedManagerEmbed = oEmbedManagerEmbedElem.textContent;
  }
  if(oEmbedManagerEmbed != null && oEmbedManagerEmbed != ''){
    document.getElementById(id).innerHTML = oEmbedManagerEmbed;
  }
  _gaq.push(['_trackEvent', 'Videos', 'Play', document.getElementById(id).embedcode]);
}


/*  Unused function with the ability to toggle a play button image 
    over a video thumb for hover state

function oEmbedManagerToggleUIHover(id){
  console.log("document.getElementById("+id+").getElementsByClassName('active');");
  oemanActive = document.getElementById(id).getElementsByClassName('active')[0];
  oemanInactive = document.getElementById(id).getElementsByClassName('inactive')[0];
  console.log(oemanActive.style.display);
  if(oemanActive.style.display == 'block'){
    oemanActive.style.display = 'none';
    oemanInactive.style.display = 'block';
  }
  else{
    oemanActive.style.display = 'block';
    oemanInactive.style.display = 'none';
  }
}
*/