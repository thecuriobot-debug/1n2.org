/* Herp all the derps.

   Copyright © 2012 Jamie Zawinski <jwz@jwz.org>

   Permission to use, copy, modify, distribute, and sell this software and its
   documentation for any purpose is hereby granted without fee, provided that
   the above copyright notice appear in all copies and that both that
   copyright notice and this permission notice appear in supporting
   documentation.  No representations are made about the suitability of this
   software for any purpose.  It is provided "as is" without express or 
   implied warranty.

   http://www.jwz.org/herpderp/

   This herps all the derps.

   This adds a checkbox to your comments page that replaces the text of
   all of the comments with "Herp Derp".  The setting is persistent for
   each user, via a cookie.

   Inspired by "Herp Derp Youtube Comments" by Tanner Stokes:
   http://www.tannr.com/herp-derp-youtube-comments/

   This version by jwz, created: 13-Dec-2012. Derp.
 */

function derp(pp, herpa) {
  var aa = pp.getElementsByTagName('p');
  for (var i = 0; i < aa.length; i++) {
    var p = aa[i];
    if (! p.herp) {
      p.herp = p.innerHTML;
      p.derp = p.innerHTML;
      p.derp = p.derp.replace (new RegExp("<BR */?>", "gi"), "\n");
      p.derp = p.derp.replace (/<P\b[^<>]*>/gi, "\n\n");
      p.derp = p.derp.replace (/<[^<>]*>/gi, "");
      p.derp = p.derp.replace (/[:.]([^\s])/gi, '$1');
      p.derp = p.derp.replace (/([^-.!?,;:\"\s]+)/gi,
          function (s) {
            var hd = ['herp', 'HERP', 'Herp',
                      'derp', 'DERP', 'Derp'];
            var j;
            if (s == s.toLowerCase()) j = 0;
            else if (s.length > 1 && s == s.toUpperCase()) j = 1;
            else j = 2;
            if (Math.random() > 0.5) j += 3;
            return hd[j];
          });
      p.derp = p.derp.replace (/\n\n+/g, "<P>");
      p.derp = p.derp.replace (/\n/g, "<BR>");
    }
    p.innerHTML = (herpa ? p.herp : p.derp);
    p.onclick = herpclerk;
  }
}

function herpclerk(e) {
  var p = e.target;
  derp (p.parentNode, p.herp != p.innerHTML);
  return false;
}

function herpa(derpa) {
  var aa = document.getElementsByTagName('span');
  for (var i = 0; i < aa.length; i++) {
    if (aa[i].className.match (/\bherpc\b/)) {
      derp (aa[i], !derpa);
    }
  }
}

function cherp() {
  var cc = document.cookie.split(";");
  for (var i = 0; i < cc.length; i++) {
    var a = cc[i].indexOf("=");
    var k = cc[i].substr(0, a).replace(/^\s+|\s+$/g, '');
    var v = cc[i].substr(a+1). replace(/^\s+|\s+$/g, '');
    if (k == 'herp')
      return (v == 'derp');
  }

  return (Derpfault && Derpfault.herp == 'herp');
}

function cderp(derp) {
  var d = new Date();
  d.setDate (d.getDate() + (60 * 60 * 24 * 365));
  var c = "herp=" + (derp ? "derp" : "nerp") +
    "; path=/; expires=" + d.toUTCString();
  document.cookie = c;
}


function herpterg(e) {
  herpa (e.target.checked);
  cderp (e.target.checked);
  return false;
}

function herpies() {
  var e = document.getElementById ('comments');
  if (! e) return;

  var derp = cherp();
  if (derp) herpa (derp);
  var p = document.createElement('div');
  var cb = '<INPUT TYPE=CHECKBOX ' +
           (derp ? 'CHECKED ' : '') +
           'ONCLICK="herpterg(event)">';
  cb = 'Herp Derp' + cb;
  p.innerHTML = cb;
  p.className = 'herpderp';
  e.parentNode.insertBefore (p, e);
}

herpies();
