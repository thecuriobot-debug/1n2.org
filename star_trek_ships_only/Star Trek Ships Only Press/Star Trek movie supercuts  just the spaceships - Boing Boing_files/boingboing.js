// Prevents IE from stopping Javascript from running. Do not remove.
if (!window.console) console = {
    log: function() {}
};

function alignHomepageFeatures(adblock, feature_class) {
    $('.feature').each(function() {
        if ($(this).offset().top > $(adblock).offset().top && $(this).offset().top <= $(adblock).offset().top + $(adblock).height()) {
            $(this).addClass(feature_class);
        }
    });
}

$(document).ready(function() {
    if ($('#adblock_skyscraper').length) {
        alignHomepageFeatures('#adblock_skyscraper', 'feature-medium');
        setTimeout(function() {
            alignHomepageFeatures('#adblock_skyscraper', 'feature-medium');
        }, 3000);
        setTimeout(function() {
            alignHomepageFeatures('#adblock_skyscraper', 'feature-medium');
        }, 6000);
    };
});

// on iPhone: turns off the single-column CSS view in favour of the standard layout, without reloading the page
showAll = function() {
    viewport = document.querySelector("meta[name=viewport]");
    viewport.setAttribute('content', 'width=960, user-scalable=yes');
}

// Show author info when their sidebar links are clicked
showAuthorSidebar = function(x) {
    if (document.getElementById(x).style.height != 'auto') {
        document.getElementById(x).style.height = 'auto';
        document.getElementById(x + 'Arrow').innerHTML = '&#9660';
    } else {
        document.getElementById(x).style.height = '22px';
        document.getElementById(x + 'Arrow').innerHTML = '&#9654';
    }
}

// Show Author card popups when people mouseover bylines for however long is specified in the setTimeout. Thought it's called showAuthor, x is actually the CSS ID for the card being shown -- one for each post in the river.
showAuthor = function(x) {
    t = setTimeout(function() {
        $('#' + x).css('display', 'block').css('opacity', '.9').delay(4000).fadeOut(2000);
    }, 500);
}

//Called by onmouseout, this ensures the Show Author popup won't appear if the reader only briefly hovers on the byline
dontshowAuthor = function(x) {
    clearTimeout(t);
}

/*When the browser window is resized, if the background is all obscured width-wise, hide it vertically too to avoid an odd strip of color at the top of the screen.
coverBack = function() {
  $(window).resize(function() {

    var w = $('#container').offset().left; //distance between left edge of window and left edge of the opaque content area.
    if (w <= 10 ) { $('#container').animate({ marginTop: w }, 10);}
    else {  $('#container').animate({ marginTop: 10 }, 10);}


    //On grid pages, make sure the vertical margins equal the horizontal ones: all calculated from the width of the page. THIS BREAKS ON PAGES WITH NO GRIDIMAGES imgs
    //$('img.gridImages').css('marginBottom', (columnGrid.offsetWidth*0.02688)-2 + 'px');

    }
  );
}*/


/* Resize images on the homepage to fit next to the ad if necessary */
function resizeAdrightImages() {
    if ($(window).width() < 1300) {
        $('.post').each(function() {
            var top = $(this).offset().top;
            if ($('.adblock').length > 0 && top < $('.adblock').height() + $('.adblock').offset().top) {
                $(".content img", this).each(function() {
                    if ($(this).width() > 413) {
                        $(this).addClass('adright');
                    }
                });
            }
        });
    } else {
        $('.post .content img.adright').removeClass('adright');
    }
}

/* Resize ad iframe height to match content size */
function resizeIframe(newHeight, unit) {
    newHeight = parseInt(newHeight);
    if (newHeight < 250) {
        newHeight = 250;
    }
    document.getElementById(unit + '_frame').style.height = newHeight + 'px';
    $('#' + unit + '_frame').css('height', newHeight + 'px');
}

/* Manage body background color class for different sized pages */
function manageCustomBackgroundColors() {
    if ($(window).width() < 1024) {
        $('body').removeClass('custom-background');
    } else {
        $('body').addClass('custom-background');
    }
}

function resizePage() {
    resizeAdrightImages();
    manageCustomBackgroundColors();
}

$(window).resize(resizePage);
$(document).ready(resizePage);

function bindSearchOpen() {
    $('#searchlink').click(function() {
        $('#searchbox').fadeIn(200);
        setTimeout('bindSearchClose()', 500);
    });
}

function bindSearchClose() {
    $('*:not(#searchbox)').click(function(event) {
        if (!$(event.target).hasClass('searchbox')) {
            $('#searchbox').fadeOut(500);
            $('*:not(#searchbox)').unbind();
            bindSearchOpen();
        }
    });
}

//Show the search box when the magnifying class icon is clicked
bindSearchOpen();


//jQuery: When the page is reader for the DOM to be manipulated
$(document).ready(function() {

    //The sidebar, being absolutely positioned, may not be contained by short posts. This makes sure it is.
    if (document.getElementById("sidebar") != null) {
        var sh = document.getElementById("sidebar").offsetHeight;
        var ch = document.getElementById("container").offsetHeight;
        if (ch < sh) {
            document.getElementById("container").style.minHeight = sh + 500 + "px";
        }
    }

    // coverBack();

    //Hit escape to get rid of the search box popup if its open
    $(document.documentElement).keyup(function(event) {
        if (event.keyCode == 27) {
            $('#searchbox').fadeOut(200);
        }
    });

    //Display or fade out podcast links in the navigation area when "more" is moused over
    $('#podcastslink').mouseover(function() {
        $('#podcasts').fadeIn(200);
        $('#more').hide();
    });
    $('#podcastslink').mouseleave(function() {
        $('#podcasts').delay(5000).fadeOut(200);
    });

    //Display or fade out more links in the navigation area when "more" is moused over
    $('#morelink').mouseover(function() {
        $('#more').fadeIn(200);
        $('#podcasts').hide();
    });
    $('#morelink').mouseleave(function() {
        $('#more').delay(5000).fadeOut(200);
    });

    $('div.navbar .social').mouseover(function(){
        $('div.navbar .social .social-links').show();
    });

    $('div.navbar .social').mouseout(function(){
        $('div.navbar .social .social-links').hide();
    });

    //On grid pages, make sure the vertical margins equal the horizontal ones: all calculated from the width of the page
    //$('img.gridImages').css('marginBottom', (columnGrid.offsetWidth*0.02688)-2 + 'px');

    // Reloads iframes in order to make sure their position is correct on the screen.
    // Limited to just the iframes within the column div.
    var column = document.getElementById('posts-loop');
    if (column) {
        var f = column.getElementsByTagName('iframe');
        for (var i = 0; i < f.length; i++) {
            if (f[i].src != null && f[i].src != '') {
                f[i].src = f[i].src;
            }
        }
    }
});


// Google Analytics click tracking
function clickTrack(url, action, label){
    if(url && action && label){
        clickedURL = url;
        if(typeof(event) != "undefined") event.returnValue = false;
        ga('send', 'event', {
            'eventCategory' : 'UI Click',
            'eventAction'   : action,
            'eventLabel'    : label,
            'hitCallback'   : function () {
                document.location = clickedURL;
            }
        }); 
        return false;
    }
    return true;
}


function toggleStickySidebar() {
    var theCurrentLoc = $('#sidebarsticky').offset().top;
    var scrolled = $(document).scrollTop();
    var windowHeight = $(window).height();
    var theStickyPoiny = $('#sidebarPinPoint').offset().top;

    //document.getElementById('debugger').innerHTML = "theCurrentLoc = " + theCurrentLoc + " scrolled = " + scrolled + " windowHeight = " + windowHeight  ;

    if (theStickyPoiny - 55 >= scrolled) {
        //BUT DON'T PIN UNTIL THEY SCROLL DOWN AND THE STICKY BOX HITS THE TOP OF THE VIEWPORT
        if ($('#sidebarsticky').hasClass('fixed')) {
            $('#sidebarsticky').removeClass('fixed');
        }
    } else { // UNPIN AT THE PIN POINT WHEN SCROLLING BACK UP TO THE TOP
        if (!$('#sidebarsticky').hasClass('fixed')) {
            $('#sidebarsticky').addClass('fixed');
        }
    }
}

if ($('#sidebarsticky').length > 0) {
    //PINNING THE SIDEBAR -- starting with some variables we need
    var theOriginalLoc = $('#sidebarsticky').offset().top; //sidebarsticky is the div we pin. Currently way down at the bottom
    var scrolled = $(document).scrollTop();

    //To stop weird behavior, we pin the sidebar sticky box not based on its own location but a reliable anchor. Otherwise it will jump around as changes in its own position trigger further movements. (i.e. flickering on-off of pinning)
    //One way to do this is track the current position of the bottom of the sidebar element above it
    //Another is to simply store its own initial location in a variable. This won't account for changes in the side of the sidebar elements above the pinned section, however.

    //Whenever the page is scrolled, let's see if we should pin the sidebar
    $(window).scroll(function() {
        toggleStickySidebar();
    });

    $(window).resize(function() {
        toggleStickySidebar();
    });
}


//TOGGLE CONTENT -- hides or shows the content of the page to reveal the background art behind it.
function toggleContent() {
    if ($('#container').css('visibility') == 'hidden') {
        $('#container').css('display', 'none');
        $('#ad_leaderboard').css('display', 'none');
        $('#container').css('visibility', 'visible');
        $('#ad_leaderboard').css('visibility', 'visible');
        $('#container').fadeIn();
        $('#ad_leaderboard').fadeIn();
    } else {
        $('#container').fadeOut();
        $('#ad_leaderboard').fadeOut();
        $('#container').css('visibility', 'hidden');
        $('#ad_leaderboard').css('visibility', 'hidden');
        $('#container').css('display', 'block !important');
        $('#ad_leaderboard').css('display', 'block !important');
    }
}