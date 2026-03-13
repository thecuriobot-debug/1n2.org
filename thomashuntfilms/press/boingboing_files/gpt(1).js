document.addEventListener("DOMContentLoaded", function(event) {
    var mapped_ads = [],
        refreshable_ads = [],
        refresh_time = (UD_GPT.refresh_time) ? UD_GPT.refresh_time : 30000;

    var _debounce = function(func, wait, immediate) {
                        var timeout;
                        return function() {
                            var context = this, args = arguments,
                                later = function() {
                                    timeout = null;
                                    if (!immediate) func.apply(context, args);
                                },
                                callNow = immediate && !timeout;

                            clearTimeout(timeout);
                            timeout = setTimeout(later, wait);
                            if (callNow) func.apply(context, args);
                        };
                    };


    UD_GPT.defined_slots = [];
    UD_GPT.testing = /[\\?&]test=([^&#]*)/.exec(location.search);
    UD_GPT.mappings = {
        wide: [[[0, 0], [300, 50]], [[480, 200], [468, 60]], [[768, 200], [728, 90]], [[1000, 200], [[970,90], [728, 90]]]]
    }

    googletag.cmd.push(function() {

        if (UD_GPT.testing) {
            UD_GPT.targeting['test'] = UD_GPT.testing[1];
        }

        for (var key in UD_GPT.targeting) {
            if (UD_GPT.targeting.hasOwnProperty(key)) {
                googletag.pubads().setTargeting(key, UD_GPT.targeting[key]);
            }
        }

        UD_GPT.slots.forEach(function(slot) {
            var slotName = "gpt-ad-" + slot.name.toLowerCase(),
                definedSlot;

            if (document.getElementById(slotName)) {
                if (slot.sizes) {
                    definedSlot = googletag.defineSlot(UD_GPT.ad_path, slot.sizes, slotName).setTargeting("pos", slot.name);
                } else {
                    definedSlot = googletag.defineOutOfPageSlot(UD_GPT.ad_path, slotName)
                }

                if (slot.mapping) {
                    var mapping = googletag.sizeMapping();

                    UD_GPT.mappings[slot.mapping].forEach(function(map) {
                        mapping.addSize(map[0], map[1]);
                    });

                    definedSlot.defineSizeMapping(mapping.build());

                    mapped_ads.push(definedSlot);
                }

                definedSlot.addService(googletag.pubads());

                definedSlot.UD =  {
                    name: slotName,
                    refresh: (slot.refresh) ? slot.refresh : false
                }

                if (slot.callback) {
                    definedSlot.renderEnded = function(){
                        if (document.getElementById(slotName).style.display === "") {
                            slot.callback();
                        }
                    };
                }

                UD_GPT.defined_slots.push(definedSlot);
            }
        });

        googletag.pubads().collapseEmptyDivs(true);
        googletag.pubads().setCentering(true);
        googletag.pubads().enableSingleRequest();
        googletag.enableServices();

        UD_GPT.defined_slots.forEach(function(slot) {
            googletag.display(slot.UD.name);

            if (slot.UD.refresh) {
                refreshable_ads.push(slot);
            }
        });

        if (mapped_ads.length) {
            window.addEventListener("resize", _debounce(function() {
                googletag.pubads().refresh(mapped_ads);
            }, 200));
        }

        if (refreshable_ads.length && !UD_GPT.refresh_all) {
            setInterval(function() {
                refreshable_ads.forEach(function(slot) {
                    googletag.pubads().refresh([slot]);
                });
            }, refresh_time);
        }

        if (UD_GPT.refresh_all) {
            setInterval(function() {
                googletag.pubads().refresh();
            }, refresh_time);
        }
    });
});
