/**
 * ============================================================
 * PERFORMANCE ENGINE — Data Structures & Algorithms
 * For: Hasin Shaikh Portfolio Website
 * ============================================================
 * 
 * DSA Implementations:
 * 1. Throttle & Debounce       — Rate-limiting for scroll/resize events
 * 2. LRU Cache                 — O(1) get/put with Doubly Linked List + HashMap
 * 3. Min-Heap Priority Queue   — Resource loading prioritization
 * 4. Binary Search             — O(log n) scroll-spy section detection
 * 5. RAF Scheduler             — Batched DOM reads/writes (prevents layout thrashing)
 * 6. Virtual Scroller          — Only renders visible portfolio cards
 * 7. Object Pool               — Recycles animation/particle objects
 * 8. Trie                      — Fast prefix search for skills/content filtering
 * 9. Spatial Hash Grid         — O(1) particle neighbor lookup
 * 10. Bloom Filter             — Probabilistic "already loaded" checks
 * ============================================================
 */

// ============================================================
// 1. THROTTLE & DEBOUNCE — Rate Limiting Algorithms
//    Time Complexity: O(1) per call
//    Prevents scroll/resize from firing 60+ times/second
// ============================================================

function throttle(fn, limit) {
    let lastCall = 0;
    let timeoutId = null;
    
    return function(...args) {
        const now = performance.now();
        const remaining = limit - (now - lastCall);
        
        if (remaining <= 0) {
            if (timeoutId) {
                cancelAnimationFrame(timeoutId);
                timeoutId = null;
            }
            lastCall = now;
            fn.apply(this, args);
        } else if (!timeoutId) {
            // Trailing edge: ensure last event is captured
            timeoutId = setTimeout(() => {
                lastCall = performance.now();
                timeoutId = null;
                fn.apply(this, args);
            }, remaining);
        }
    };
}

function debounce(fn, delay, immediate = false) {
    let timeoutId = null;
    
    return function(...args) {
        const callNow = immediate && !timeoutId;
        
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            timeoutId = null;
            if (!immediate) fn.apply(this, args);
        }, delay);
        
        if (callNow) fn.apply(this, args);
    };
}


// ============================================================
// 2. LRU CACHE — Doubly Linked List + HashMap
//    Get: O(1), Put: O(1), Evict: O(1)
//    Caches element positions to avoid expensive getBoundingClientRect()
// ============================================================

class LRUNode {
    constructor(key, value) {
        this.key = key;
        this.value = value;
        this.prev = null;
        this.next = null;
        this.timestamp = performance.now();
    }
}

class LRUCache {
    constructor(capacity = 50, ttl = 1000) {
        this.capacity = capacity;
        this.ttl = ttl;           // Time-to-live in ms (positions change on scroll)
        this.map = new Map();     // HashMap for O(1) lookup
        // Sentinel nodes — avoid null checks
        this.head = new LRUNode('HEAD', null);
        this.tail = new LRUNode('TAIL', null);
        this.head.next = this.tail;
        this.tail.prev = this.head;
        this.hits = 0;
        this.misses = 0;
    }
    
    // Move node to front (most recently used) — O(1)
    _moveToFront(node) {
        // Remove from current position
        node.prev.next = node.next;
        node.next.prev = node.prev;
        // Insert after head
        node.next = this.head.next;
        node.prev = this.head;
        this.head.next.prev = node;
        this.head.next = node;
    }
    
    // Remove least recently used (tail.prev) — O(1)
    _evictLRU() {
        const lru = this.tail.prev;
        if (lru === this.head) return null;
        lru.prev.next = this.tail;
        this.tail.prev = lru.prev;
        this.map.delete(lru.key);
        return lru;
    }
    
    get(key) {
        const node = this.map.get(key);
        if (!node) {
            this.misses++;
            return null;
        }
        // Check TTL — stale entries return null
        if (performance.now() - node.timestamp > this.ttl) {
            this._remove(node);
            this.misses++;
            return null;
        }
        this.hits++;
        this._moveToFront(node);
        return node.value;
    }
    
    put(key, value) {
        let node = this.map.get(key);
        if (node) {
            node.value = value;
            node.timestamp = performance.now();
            this._moveToFront(node);
        } else {
            if (this.map.size >= this.capacity) {
                this._evictLRU();
            }
            node = new LRUNode(key, value);
            this.map.set(key, node);
            // Insert at front
            node.next = this.head.next;
            node.prev = this.head;
            this.head.next.prev = node;
            this.head.next = node;
        }
    }
    
    _remove(node) {
        node.prev.next = node.next;
        node.next.prev = node.prev;
        this.map.delete(node.key);
    }
    
    invalidate() {
        this.map.clear();
        this.head.next = this.tail;
        this.tail.prev = this.head;
    }
    
    getStats() {
        const total = this.hits + this.misses;
        return {
            size: this.map.size,
            hits: this.hits,
            misses: this.misses,
            hitRate: total > 0 ? ((this.hits / total) * 100).toFixed(1) + '%' : 'N/A'
        };
    }
}


// ============================================================
// 3. MIN-HEAP PRIORITY QUEUE — Binary Heap
//    Insert: O(log n), Extract-Min: O(log n), Peek: O(1)
//    Used for resource loading prioritization (images, scripts)
// ============================================================

class MinHeapPriorityQueue {
    constructor() {
        this.heap = [];
    }
    
    _parent(i) { return Math.floor((i - 1) / 2); }
    _left(i) { return 2 * i + 1; }
    _right(i) { return 2 * i + 2; }
    
    _swap(i, j) {
        [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
    }
    
    // Bubble up — O(log n)
    _siftUp(i) {
        while (i > 0 && this.heap[this._parent(i)].priority > this.heap[i].priority) {
            this._swap(i, this._parent(i));
            i = this._parent(i);
        }
    }
    
    // Bubble down — O(log n)
    _siftDown(i) {
        const n = this.heap.length;
        let smallest = i;
        const left = this._left(i);
        const right = this._right(i);
        
        if (left < n && this.heap[left].priority < this.heap[smallest].priority) {
            smallest = left;
        }
        if (right < n && this.heap[right].priority < this.heap[smallest].priority) {
            smallest = right;
        }
        if (smallest !== i) {
            this._swap(i, smallest);
            this._siftDown(smallest);
        }
    }
    
    // Insert with priority — O(log n)
    enqueue(item, priority) {
        this.heap.push({ item, priority });
        this._siftUp(this.heap.length - 1);
    }
    
    // Extract highest priority (lowest number) — O(log n)
    dequeue() {
        if (this.heap.length === 0) return null;
        const min = this.heap[0];
        const last = this.heap.pop();
        if (this.heap.length > 0) {
            this.heap[0] = last;
            this._siftDown(0);
        }
        return min.item;
    }
    
    peek() {
        return this.heap.length > 0 ? this.heap[0].item : null;
    }
    
    get size() { return this.heap.length; }
    get isEmpty() { return this.heap.length === 0; }
}


// ============================================================
// 4. BINARY SEARCH — Scroll Spy Section Detection
//    O(log n) instead of O(n) linear scan for active section
//    Pre-sorts sections by offset, binary searches scroll position
// ============================================================

class ScrollSpy {
    constructor(sectionIds, offset = 80) {
        this.sectionIds = sectionIds;
        this.offset = offset;
        this.sections = [];       // Sorted array of {id, top}
        this.activeSection = null;
        this.callbacks = [];
        this._buildSectionMap();
    }
    
    _buildSectionMap() {
        this.sections = this.sectionIds
            .map(id => {
                const el = document.getElementById(id);
                if (!el) return null;
                return {
                    id,
                    el,
                    top: el.offsetTop - this.offset
                };
            })
            .filter(Boolean)
            .sort((a, b) => a.top - b.top); // Sort by offset position
    }
    
    // Binary search for current section — O(log n)
    _binarySearchSection(scrollY) {
        const sections = this.sections;
        let lo = 0;
        let hi = sections.length - 1;
        let result = -1;
        
        while (lo <= hi) {
            const mid = Math.floor((lo + hi) / 2);
            if (sections[mid].top <= scrollY) {
                result = mid;
                lo = mid + 1;   // Look for a later section that also qualifies
            } else {
                hi = mid - 1;
            }
        }
        
        return result >= 0 ? sections[result].id : null;
    }
    
    // Called on throttled scroll — O(log n)
    update(scrollY) {
        const activeId = this._binarySearchSection(scrollY);
        if (activeId !== this.activeSection) {
            this.activeSection = activeId;
            this.callbacks.forEach(cb => cb(activeId));
        }
    }
    
    onChange(callback) {
        this.callbacks.push(callback);
    }
    
    // Rebuild on resize (positions change)
    rebuild() {
        this._buildSectionMap();
    }
}


// ============================================================
// 5. RAF SCHEDULER — Batched DOM Read/Write Queue
//    Prevents layout thrashing by separating reads and writes
//    Uses requestAnimationFrame for 60fps performance
// ============================================================

class RAFScheduler {
    constructor() {
        this.readQueue = [];
        this.writeQueue = [];
        this.scheduled = false;
    }
    
    // Queue a DOM read (e.g., getBoundingClientRect, offsetHeight)
    read(fn) {
        this.readQueue.push(fn);
        this._schedule();
    }
    
    // Queue a DOM write (e.g., style changes, class toggles)
    write(fn) {
        this.writeQueue.push(fn);
        this._schedule();
    }
    
    _schedule() {
        if (!this.scheduled) {
            this.scheduled = true;
            requestAnimationFrame(() => this._flush());
        }
    }
    
    // Execute all reads first, then all writes — prevents thrashing
    _flush() {
        // Batch reads (triggers layout once)
        const reads = this.readQueue.splice(0);
        reads.forEach(fn => fn());
        
        // Batch writes (triggers repaint once)
        const writes = this.writeQueue.splice(0);
        writes.forEach(fn => fn());
        
        this.scheduled = false;
        
        // If new tasks were added during flush, schedule again
        if (this.readQueue.length || this.writeQueue.length) {
            this._schedule();
        }
    }
}


// ============================================================
// 6. VIRTUAL SCROLLER — Renders Only Visible Elements
//    Reduces DOM nodes from N to ~visible+buffer
//    Uses element recycling for smooth scrolling
// ============================================================

class VirtualScroller {
    constructor(container, items, renderFn, options = {}) {
        this.container = container;
        this.items = items;
        this.renderFn = renderFn;
        this.itemWidth = options.itemWidth || 320;
        this.buffer = options.buffer || 2;       // Extra items on each side
        this.gap = options.gap || 20;
        
        this.visibleItems = new Map();           // HashMap: index → DOM node
        this.recyclePool = [];                   // Object pool for recycled nodes
        this.scrollLeft = 0;
        
        this._init();
    }
    
    _init() {
        // Set total width for proper scrollbar
        const totalWidth = this.items.length * (this.itemWidth + this.gap);
        this.container.style.position = 'relative';
        
        // Create inner spacer
        this.spacer = document.createElement('div');
        this.spacer.style.width = totalWidth + 'px';
        this.spacer.style.height = '1px';
        this.spacer.style.position = 'absolute';
        this.spacer.style.top = '0';
        this.spacer.style.left = '0';
        this.spacer.style.pointerEvents = 'none';
        this.container.appendChild(this.spacer);
        
        // Throttled scroll handler
        this.container.addEventListener('scroll', throttle(() => {
            this.scrollLeft = this.container.scrollLeft;
            this._render();
        }, 16)); // ~60fps
        
        this._render();
    }
    
    _getVisibleRange() {
        const containerWidth = this.container.clientWidth;
        const stride = this.itemWidth + this.gap;
        
        let startIndex = Math.floor(this.scrollLeft / stride) - this.buffer;
        let endIndex = Math.ceil((this.scrollLeft + containerWidth) / stride) + this.buffer;
        
        startIndex = Math.max(0, startIndex);
        endIndex = Math.min(this.items.length - 1, endIndex);
        
        return { startIndex, endIndex };
    }
    
    _render() {
        const { startIndex, endIndex } = this._getVisibleRange();
        const stride = this.itemWidth + this.gap;
        const newVisible = new Set();
        
        // Add newly visible items
        for (let i = startIndex; i <= endIndex; i++) {
            newVisible.add(i);
            if (!this.visibleItems.has(i)) {
                // Get recycled node or create new one
                let node = this.recyclePool.pop();
                if (node) {
                    // Reuse recycled node
                    node.innerHTML = '';
                } else {
                    node = document.createElement('div');
                    node.style.position = 'absolute';
                    node.style.top = '0';
                    node.style.width = this.itemWidth + 'px';
                }
                node.style.left = (i * stride) + 'px';
                this.renderFn(node, this.items[i], i);
                this.container.appendChild(node);
                this.visibleItems.set(i, node);
            }
        }
        
        // Recycle off-screen items
        for (const [index, node] of this.visibleItems) {
            if (!newVisible.has(index)) {
                this.container.removeChild(node);
                this.recyclePool.push(node);   // Return to pool instead of GC
                this.visibleItems.delete(index);
            }
        }
    }
}


// ============================================================
// 7. OBJECT POOL — Reusable Object Allocation
//    Avoids garbage collection pauses during animations
//    O(1) acquire, O(1) release
// ============================================================

class ObjectPool {
    constructor(factory, reset, initialSize = 20) {
        this.factory = factory;   // Function to create new object
        this.reset = reset;       // Function to reset object for reuse
        this.pool = [];
        this.activeCount = 0;
        
        // Pre-allocate
        for (let i = 0; i < initialSize; i++) {
            this.pool.push(this.factory());
        }
    }
    
    acquire() {
        this.activeCount++;
        if (this.pool.length > 0) {
            return this.pool.pop();    // O(1) — reuse existing
        }
        return this.factory();          // Create new only when pool empty
    }
    
    release(obj) {
        this.activeCount--;
        this.reset(obj);
        this.pool.push(obj);            // Return to pool — O(1)
    }
    
    get stats() {
        return {
            poolSize: this.pool.length,
            active: this.activeCount,
            total: this.pool.length + this.activeCount
        };
    }
}


// ============================================================
// 8. TRIE — Prefix Tree for Fast Content Search
//    Insert: O(m), Search: O(m), Prefix: O(m+k)
//    m = word length, k = number of results
//    For skills/portfolio filtering
// ============================================================

class TrieNode {
    constructor() {
        this.children = new Map();   // HashMap for O(1) child lookup
        this.isEnd = false;
        this.data = null;            // Store associated data at leaf
    }
}

class Trie {
    constructor() {
        this.root = new TrieNode();
    }
    
    // Insert word — O(m)
    insert(word, data = null) {
        let node = this.root;
        const lower = word.toLowerCase();
        for (const char of lower) {
            if (!node.children.has(char)) {
                node.children.set(char, new TrieNode());
            }
            node = node.children.get(char);
        }
        node.isEnd = true;
        node.data = data;
    }
    
    // Exact search — O(m)
    search(word) {
        let node = this.root;
        const lower = word.toLowerCase();
        for (const char of lower) {
            if (!node.children.has(char)) return null;
            node = node.children.get(char);
        }
        return node.isEnd ? node.data : null;
    }
    
    // Prefix autocomplete — O(m + k)
    startsWith(prefix, maxResults = 10) {
        let node = this.root;
        const lower = prefix.toLowerCase();
        for (const char of lower) {
            if (!node.children.has(char)) return [];
            node = node.children.get(char);
        }
        
        // BFS to collect all words with this prefix
        const results = [];
        const queue = [{ node, word: lower }];
        
        while (queue.length > 0 && results.length < maxResults) {
            const { node: curr, word: currWord } = queue.shift();
            if (curr.isEnd) {
                results.push({ word: currWord, data: curr.data });
            }
            for (const [char, child] of curr.children) {
                queue.push({ node: child, word: currWord + char });
            }
        }
        
        return results;
    }
}


// ============================================================
// 9. SPATIAL HASH GRID — O(1) Neighbor Lookup for Particles
//    Divides space into cells for fast collision/proximity checks
//    Instead of O(n²) all-pairs → O(n) with constant cell lookups
// ============================================================

class SpatialHashGrid {
    constructor(cellSize = 100) {
        this.cellSize = cellSize;
        this.grid = new Map();      // HashMap: "x,y" → Set of particles
    }
    
    _hash(x, y) {
        const cx = Math.floor(x / this.cellSize);
        const cy = Math.floor(y / this.cellSize);
        return `${cx},${cy}`;
    }
    
    // Insert particle — O(1)
    insert(particle) {
        const key = this._hash(particle.x, particle.y);
        if (!this.grid.has(key)) {
            this.grid.set(key, new Set());
        }
        this.grid.get(key).add(particle);
        particle._gridKey = key;
    }
    
    // Update particle position — O(1)
    update(particle) {
        const newKey = this._hash(particle.x, particle.y);
        if (newKey !== particle._gridKey) {
            this.remove(particle);
            this.insert(particle);
        }
    }
    
    // Remove particle — O(1)
    remove(particle) {
        if (particle._gridKey && this.grid.has(particle._gridKey)) {
            this.grid.get(particle._gridKey).delete(particle);
            if (this.grid.get(particle._gridKey).size === 0) {
                this.grid.delete(particle._gridKey);
            }
        }
    }
    
    // Find neighbors within radius — O(1) average (checks 9 cells max)
    findNearby(x, y, radius) {
        const results = [];
        const cellRadius = Math.ceil(radius / this.cellSize);
        const cx = Math.floor(x / this.cellSize);
        const cy = Math.floor(y / this.cellSize);
        
        for (let dx = -cellRadius; dx <= cellRadius; dx++) {
            for (let dy = -cellRadius; dy <= cellRadius; dy++) {
                const key = `${cx + dx},${cy + dy}`;
                const cell = this.grid.get(key);
                if (cell) {
                    for (const particle of cell) {
                        const dist = Math.hypot(particle.x - x, particle.y - y);
                        if (dist <= radius) {
                            results.push({ particle, distance: dist });
                        }
                    }
                }
            }
        }
        
        return results;
    }
    
    clear() {
        this.grid.clear();
    }
}


// ============================================================
// 10. BLOOM FILTER — Probabilistic "Already Loaded" Check
//     O(k) insert/check where k = number of hash functions
//     False positives possible, but NO false negatives
//     Used to avoid re-loading resources
// ============================================================

class BloomFilter {
    constructor(size = 1024, hashCount = 3) {
        this.size = size;
        this.hashCount = hashCount;
        this.bits = new Uint8Array(Math.ceil(size / 8)); // Bit array
        this.count = 0;
    }
    
    // MurmurHash3-inspired hash — O(m)
    _hash(str, seed) {
        let h = seed | 0;
        for (let i = 0; i < str.length; i++) {
            h = Math.imul(h ^ str.charCodeAt(i), 0x5bd1e995);
            h ^= h >>> 15;
        }
        return Math.abs(h) % this.size;
    }
    
    _setBit(pos) {
        this.bits[pos >>> 3] |= (1 << (pos & 7));
    }
    
    _getBit(pos) {
        return (this.bits[pos >>> 3] & (1 << (pos & 7))) !== 0;
    }
    
    // Add item — O(k)
    add(item) {
        for (let i = 0; i < this.hashCount; i++) {
            const pos = this._hash(String(item), i * 0x9e3779b9);
            this._setBit(pos);
        }
        this.count++;
    }
    
    // Check if item might exist — O(k)
    mightContain(item) {
        for (let i = 0; i < this.hashCount; i++) {
            const pos = this._hash(String(item), i * 0x9e3779b9);
            if (!this._getBit(pos)) return false;  // Definitely NOT in set
        }
        return true;  // Probably in set (may be false positive)
    }
    
    get falsePositiveRate() {
        const m = this.size;
        const k = this.hashCount;
        const n = this.count;
        return Math.pow(1 - Math.exp(-k * n / m), k);
    }
}


// ============================================================
// 11. RESOURCE PRELOADER — Combines Priority Queue + Bloom Filter
//     Loads critical resources first, skips already-loaded ones
// ============================================================

class ResourcePreloader {
    constructor() {
        this.queue = new MinHeapPriorityQueue();
        this.loaded = new BloomFilter(512, 3);
        this.loading = new Set();
    }
    
    // Priority: 1=critical (above fold), 2=important, 3=lazy
    add(url, type, priority = 2) {
        if (this.loaded.mightContain(url) || this.loading.has(url)) return;
        this.queue.enqueue({ url, type }, priority);
    }
    
    // Process queue — loads highest priority first
    async processQueue(concurrency = 3) {
        const promises = [];
        
        while (!this.queue.isEmpty && promises.length < concurrency) {
            const resource = this.queue.dequeue();
            if (!resource || this.loaded.mightContain(resource.url)) continue;
            
            this.loading.add(resource.url);
            promises.push(this._loadResource(resource));
        }
        
        await Promise.allSettled(promises);
        
        // Continue if more in queue
        if (!this.queue.isEmpty) {
            requestIdleCallback(() => this.processQueue(concurrency));
        }
    }
    
    _loadResource({ url, type }) {
        return new Promise((resolve, reject) => {
            let el;
            switch (type) {
                case 'image':
                    el = new Image();
                    el.onload = () => { this._onLoaded(url); resolve(); };
                    el.onerror = reject;
                    el.src = url;
                    break;
                case 'script':
                    el = document.createElement('script');
                    el.async = true;
                    el.onload = () => { this._onLoaded(url); resolve(); };
                    el.onerror = reject;
                    el.src = url;
                    document.head.appendChild(el);
                    break;
                case 'style':
                    el = document.createElement('link');
                    el.rel = 'stylesheet';
                    el.onload = () => { this._onLoaded(url); resolve(); };
                    el.onerror = reject;
                    el.href = url;
                    document.head.appendChild(el);
                    break;
                case 'font':
                    const font = new FontFace('preloaded', `url(${url})`);
                    font.load().then(() => { this._onLoaded(url); resolve(); }).catch(reject);
                    break;
                default:
                    fetch(url).then(() => { this._onLoaded(url); resolve(); }).catch(reject);
            }
        });
    }
    
    _onLoaded(url) {
        this.loaded.add(url);
        this.loading.delete(url);
    }
}


// ============================================================
// 12. PERFORMANCE MONITOR — Tracks FPS, memory, paint times
// ============================================================

class PerformanceMonitor {
    constructor() {
        this.frames = [];
        this.maxSamples = 60;
        this.lastTime = performance.now();
        this.isRunning = false;
    }
    
    start() {
        this.isRunning = true;
        this._tick();
    }
    
    _tick() {
        if (!this.isRunning) return;
        const now = performance.now();
        const delta = now - this.lastTime;
        this.lastTime = now;
        
        this.frames.push(delta);
        if (this.frames.length > this.maxSamples) {
            this.frames.shift();
        }
        
        requestAnimationFrame(() => this._tick());
    }
    
    get fps() {
        if (this.frames.length === 0) return 0;
        const avg = this.frames.reduce((a, b) => a + b, 0) / this.frames.length;
        return Math.round(1000 / avg);
    }
    
    get avgFrameTime() {
        if (this.frames.length === 0) return 0;
        return (this.frames.reduce((a, b) => a + b, 0) / this.frames.length).toFixed(2);
    }
    
    stop() {
        this.isRunning = false;
    }
}


// ============================================================
// EXPORT — Make all DSA structures globally available
// ============================================================

window.DSA = {
    throttle,
    debounce,
    LRUCache,
    MinHeapPriorityQueue,
    ScrollSpy,
    RAFScheduler,
    VirtualScroller,
    ObjectPool,
    Trie,
    SpatialHashGrid,
    BloomFilter,
    ResourcePreloader,
    PerformanceMonitor
};

console.log('%c⚡ Performance Engine Loaded — 12 DSA Implementations Active', 
    'color: #7CFC00; font-size: 14px; font-weight: bold; background: #0D1B0E; padding: 8px 16px; border-radius: 4px;');
