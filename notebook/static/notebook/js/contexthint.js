// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

// highly adapted for codemiror jshint
define(['codemirror/lib/codemirror'], function(CodeMirror) {
    "use strict";

    var forEach = function(arr, f) {
        for (var i = 0, e = arr.length; i < e; ++i) f(arr[i]);
    };

    var arrayContains = function(arr, item) {
        if (!Array.prototype.indexOf) {
            var i = arr.length;
            while (i--) {
                if (arr[i] === item) {
                    return true;
                }
            }
            return false;
        }
        return arr.indexOf(item) != -1;
    };

    CodeMirror.contextHint = function(editor) {
        // Find the token at the cursor
        var cur = editor.getCursor(),
            token = editor.getTokenAt(cur),
            tprop = token;
        // If it's not a 'word-style' token, ignore the token.
        // If it is a property, find out what it is a property of.
        var list = [];
        var clist = getCompletions(token, editor);

        for (var i = 0; i < clist.length; i++) {
            list.push({
                str: clist[i],
                type: "context",
                from: {
                    line: cur.line,
                    ch: token.start
                },
                to: {
                    line: cur.line,
                    ch: token.end
                }
            });
        }
        return list;
    };

    // find all 'words' of current cell
    var getAllTokens = function(editor) {
        var found = [];

        // add to found if not already in it


        function maybeAdd(str) {
            if (!arrayContains(found, str)) found.push(str);
        }

        // loop through all token on all lines
        var lineCount = editor.lineCount();
        // loop on line
        for (var l = 0; l < lineCount; l++) {
            var line = editor.getLine(l);
            //loop on char
            for (var c = 1; c < line.length; c++) {
                var tk = editor.getTokenAt({
                    line: l,
                    ch: c
                });
                // if token has a class, it has geat chances of beeing
                // of interest. Add it to the list of possible completions.
                // we could skip token of ClassName 'comment'
                // or 'number' and 'operator'
                if (tk.className !== null) {
                    maybeAdd(tk.string);
                }
                // jump to char after end of current token
                c = tk.end;
            }
        }
        return found;
    };

    var getCompletions = function(token, editor) {
        /*
         * Ideas for tests:
         * Check that camelCase fails for non-alphabetic chars
         * Check that it works for case where arrLen === tokenString len
         */
        var candidates = getAllTokens(editor);

        // check used by lambda filter to search for matches along camelcase or underscore breaks
        var checkParts = function(fullStr, arr, tokenStr) {
            var maybeIndex = 0;
            var curArrIndex = 0;
            for (var i = 0; i < tokenStr.length; i++) {
                var curCharLower = tokenStr.charAt(i).toLowerCase();
                if (fullStr.charAt(maybeIndex).toLowerCase() !== curCharLower) {
                    curArrIndex++;
                    if (curArrIndex >= arr.length) {
                        return false;
                    }
                    maybeIndex = arr[curArrIndex];
                    if (fullStr.charAt(maybeIndex).toLowerCase() !== curCharLower) {
                        return false;
                    }
                }
                maybeIndex++;
                if (maybeIndex >= fullStr.length) {
                    return false;
                }
            }
            return true;
        }

        var lambda = function(x) {
            var tokenString = token.string;
            // filter all token that have a common start (but not exactly) the length of the current token
            if (x.indexOf(tokenString) === 0 && x != tokenString) {
                return true;
            } else if (tokenString.length < x.length) {
                // filter for all tokens that have common starts along camelcase or underscore breaks
                var camelBreaks = [0];
                var underScoreBreaks = [0];
                for (var i = 0; i < x.length - 1; i++) {
                    var curChar = x.charAt(i);
                    var nextChar = x.charAt(i + 1);
                    if ((nextChar >= 'a' && nextChar <= 'z') || (nextChar >= 'A' && nextChar <= 'Z')) {
                        if ((curChar >= 'a' && curChar <= 'z') && nextChar == nextChar.toUpperCase()) {
                            camelBreaks.push(i + 1);
                        } else if (curChar == '_' || curChar == '-') {
                            underScoreBreaks.push(i + 1);
                        }
                    }
                }

                if (camelBreaks.length > 1) {
                    return checkParts(x, camelBreaks, tokenString);
                } else if (underScoreBreaks.length > 1) {
                    return checkParts(x, underScoreBreaks, tokenString);
                }
            }
            return false;
        };
        
        var filtered = candidates.filter(lambda);
        return filtered;
    };

    return {'contextHint': CodeMirror.contextHint};
});
