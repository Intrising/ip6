/**
 * Created by elgs on 3/5/16.
 */
;(function () {
    'use strict';

    var normalize = function (a) {
        if (!_validate(a)) {
            throw new Error('Invalid address: ' + a);
        }
        var nh = a.split(/\:\:/g);
        if (nh.length > 2) {
            throw new Error('Invalid address: ' + a);
        }

        var sections = [];
        if (nh.length == 1) {
            // full mode
            sections = a.split(/\:/g);
            if (sections.length !== 8) {
                throw new Error('Invalid address: ' + a);
            }
        } else if (nh.length == 2) {
            // compact mode
            var n = nh[0];
            var h = nh[1];
            var ns = n.split(/\:/g);
            var hs = h.split(/\:/g);
            for (var i in ns) {
                sections[i] = ns[i];
            }
            for (var i = hs.length; i > 0; --i) {
                sections[7 - (hs.length - i)] = hs[i - 1];
            }
        }
        for (var i = 0; i < 8; ++i) {
            if (sections[i] === undefined) {
                sections[i] = '0000';
            }
            sections[i] = _leftPad(sections[i], '0', 4);
        }
        return sections.join(':');
    };

    var abbreviate = function (a) {
        if (!_validate(a)) {
            throw new Error('Invalid address: ' + a);
        }
        a = normalize(a);
        a = a.replace(/0000/g, 'g');
        a = a.replace(/\:000/g, ':');
        a = a.replace(/\:00/g, ':');
        a = a.replace(/\:0/g, ':');
        a = a.replace(/g/g, '0');
        var sections = a.split(/\:/g);
        var zPreviousFlag = false;
        var zeroStartIndex = -1;
        var zeroLength = 0;
        var zStartIndex = -1;
        var zLength = 0;
        for (var i = 0; i < 8; ++i) {
            var section = sections[i];
            var zFlag = (section === '0');
            if (zFlag && !zPreviousFlag) {
                zStartIndex = i;
            }
            if (!zFlag && zPreviousFlag) {
                zLength = i - zStartIndex;
            }
            if (zLength > 1 && zLength > zeroLength) {
                zeroStartIndex = zStartIndex;
                zeroLength = zLength;
            }
            zPreviousFlag = (section === '0');
        }
        if (zPreviousFlag) {
            zLength = 8 - zStartIndex;
        }
        if (zLength > 1 && zLength > zeroLength) {
            zeroStartIndex = zStartIndex;
            zeroLength = zLength;
        }
        //console.log(zeroStartIndex, zeroLength);
        //console.log(sections);
        if (zeroStartIndex >= 0 && zeroLength > 1) {
            sections.splice(zeroStartIndex, zeroLength, 'g');
        }
        //console.log(sections);
        a = sections.join(':');
        //console.log(a);
        a = a.replace(/\:g\:/g, '::');
        a = a.replace(/\:g/g, '::');
        a = a.replace(/g\:/g, '::');
        a = a.replace(/g/g, '::');
        //console.log(a);
        return a;
    };

    // Basic validation
    var _validate = function (a) {
        return /^[a-f0-9\\:]+$/ig.test(a);
    };

    var _leftPad = function (d, p, n) {
        var padding="";
        for (var i = 0; i < n; i++) { 
            padding+=p;
         }
        if (d.length < padding.length) {
            d = padding.substring(0, padding.length - d.length) + d;
        }
        return d;
    };

    var _hex2bin = function (hex) {
        return parseInt(hex, 16).toString(2)
    };
    var _bin2hex = function (bin) {
        return parseInt(bin, 2).toString(16)
    };

    var _addr2bin = function (addr) {
        var nAddr = normalize(addr);
        var sections = nAddr.split(":");
        var binAddr = '';
        for (var section in sections) {
            binAddr += _leftPad(_hex2bin(section), '0', 16);
        }
        return binAddr;
    };

    var _bin2addr = function (bin) {
        var addr = [];
        for (var i = 0; i < 8; ++i) {
            var binPart = bin.substr(i * 16, 16);
            var hexSection = _leftPad(_bin2hex(binPart), '0', 4);
            addr.push(hexSection);
        }
        return addr.join(':');
    };

    var divideSubnet = function (addr, mask0, mask1, limit, abbr) {
        if (!_validate(addr)) {
            throw new Error('Invalid address: ' + addr);
        }
        mask0 *= 1;
        mask1 *= 1;
        limit *= 1;
        mask1 = mask1 || 128;
        if (mask0 < 1 || mask1 < 1 || mask0 > 128 || mask1 > 128 || mask0 > mask1) {
            throw new Error('Invalid masks.');
        }
        var ret = [];
        var binAddr = _addr2bin(addr);
        var binNetPart = binAddr.substr(0, mask0);
        var binHostPart = '0'.repeat(128 - mask1);
        var numSubnets = Math.pow(2, mask1 - mask0);
        for (var i = 0; i < numSubnets; ++i) {
            if (!!limit && i >= limit) {
                break;
            }
            var binSubnet = _leftPad(i.toString(2), '0', mask1 - mask0);
            var binSubAddr = binNetPart + binSubnet + binHostPart;
            var hexAddr = _bin2addr(binSubAddr);
            if (!!abbr) {
                ret.push(abbreviate(hexAddr));
            } else {
                ret.push(hexAddr);
            }

        }
        // console.log(numSubnets);
        // console.log(binNetPart, binSubnetPart, binHostPart);
        // console.log(binNetPart.length, binSubnetPart.length, binHostPart.length);
        // console.log(ret.length);
        return ret;
    };

    var range = function (addr, mask0, mask1, abbr) {
        if (!_validate(addr)) {
            throw new Error('Invalid address: ' + addr);
        }
        mask0 *= 1;
        mask1 *= 1;
        mask1 = mask1 || 128;
        if (mask0 < 1 || mask1 < 1 || mask0 > 128 || mask1 > 128 || mask0 > mask1) {
            throw new Error('Invalid masks.');
        }
        var binAddr = _addr2bin(addr);
        var binNetPart = binAddr.substr(0, mask0);
        var binHostPart = '0'.repeat(128 - mask1);
        var binStartAddr = binNetPart + '0'.repeat(mask1 - mask0) + binHostPart;
        var binEndAddr = binNetPart + '1'.repeat(mask1 - mask0) + binHostPart;
        if (!!abbr) {
            return {
                start: abbreviate(_bin2addr(binStartAddr)),
                end: abbreviate(_bin2addr(binEndAddr)),
                size: Math.pow(2, mask1 - mask0)
            };
        } else {
            return {
                start: _bin2addr(binStartAddr),
                end: _bin2addr(binEndAddr),
                size: Math.pow(2, mask1 - mask0)
            };
        }
    };

    var randomSubnet = function (addr, mask0, mask1, limit, abbr) {
        if (!_validate(addr)) {
            throw new Error('Invalid address: ' + addr);
        }
        mask0 *= 1;
        mask1 *= 1;
        limit *= 1;
        mask1 = mask1 || 128;
        limit = limit || 1;
        if (mask0 < 1 || mask1 < 1 || mask0 > 128 || mask1 > 128 || mask0 > mask1) {
            throw new Error('Invalid masks.');
        }
        var ret = [];
        var binAddr = _addr2bin(addr);
        var binNetPart = binAddr.substr(0, mask0);
        var binHostPart = '0'.repeat(128 - mask1);
        var numSubnets = Math.pow(2, mask1 - mask0);
        for (var i = 0; i < numSubnets && i < limit; ++i) {
            // generate an binary string with length of mask1 - mask0
            var binSubnet = '';
            for (var j = 0; j < mask1 - mask0; ++j) {
                binSubnet += Math.floor(Math.random() * 2);
            }
            var binSubAddr = binNetPart + binSubnet + binHostPart;
            var hexAddr = _bin2addr(binSubAddr);
            if (!!abbr) {
                ret.push(abbreviate(hexAddr));
            } else {
                ret.push(hexAddr);
            }
        }
        // console.log(numSubnets);
        // console.log(binNetPart, binSubnetPart, binHostPart);
        // console.log(binNetPart.length, binSubnetPart.length, binHostPart.length);
        // console.log(ret.length);
        return ret;
    };

    var ptr = function (addr, mask) {
        if (!_validate(addr)) {
            throw new Error('Invalid address: ' + addr);
        }
        mask *= 1;
        if (mask < 1 || mask > 128 || Math.floor(mask / 4) != mask / 4) {
            throw new Error('Invalid masks.');
        }
        var fullAddr = normalize(addr);
        var reverse = fullAddr.replace(/:/g, '').split('').reverse();
        return reverse.slice(0, (128 - mask) / 4).join('.');
    };

    if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
        exports.normalize = normalize;
        exports.abbreviate = abbreviate;
        exports.divideSubnet = divideSubnet;
        exports.range = range;
        exports.randomSubnet = randomSubnet;
        exports.ptr = ptr;
    } else {
        window.normalize = normalize;
        window.abbreviate = abbreviate;
        window.divideSubnet = divideSubnet;
        window.range = range;
        window.randomSubnet = randomSubnet;
        window.ptr = ptr;
    }
})();