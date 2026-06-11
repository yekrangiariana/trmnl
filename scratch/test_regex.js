var html = '<table><tr><td><i class="icon icon-_blank"></i></td><td class="perms"><code>(drwxr-xr-x)</code></td><td class="last-modified">09-Jun-2026 10:41</td><td class="file-size"><code></code></td><td class="display-name"><a href="./../">../</a></td></tr>' +
'<tr><td><i class="icon icon-jpg"></i></td><td class="perms"><code>(-rw-r--r--)</code></td><td class="last-modified">11-Jun-2026 09:51</td><td class="file-size"><code>46.8k</code></td><td class="display-name"><a href="./scene-1.jpg">scene-1.jpg</a></td></tr>' +
'<tr><td><i class="icon icon-jpg"></i></td><td class="perms"><code>(-rw-r--r--)</code></td><td class="last-modified">11-Jun-2026 09:51</td><td class="file-size"><code>62.4k</code></td><td class="display-name"><a href="./scene-2.jpg">scene-2.jpg</a></td></tr></table>';

var regex = /href=["']?([^"'\s>]+?\.(?:png|jpe?g|webp|gif))["']?/gi;
var match;
var matched = {};
while ((match = regex.exec(html)) !== null) {
  var href = match[1];
  var decoded = decodeURIComponent(href);
  var basename = decoded.substring(decoded.lastIndexOf('/') + 1);
  if (basename) {
    matched[basename] = true;
  }
}
console.log(Object.keys(matched));
