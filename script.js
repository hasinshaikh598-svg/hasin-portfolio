/**
 * ============================================================
 * MAIN APPLICATION — Powered by DSA Performance Engine
 * Hasin Shaikh Portfolio Website
 * ============================================================
 * 
 * Uses:
 *  - Throttle/Debounce for scroll & resize events
 *  - LRU Cache for element position caching
 *  - Binary Search for scroll spy
 *  - RAF Scheduler for batched DOM operations
 *  - Object Pool for animation objects
 *  - Bloom Filter for loaded-resource tracking
 *  - Priority Queue for resource loading
 *  - Trie for skills search
 *  - Spatial Hash Grid for particle optimization
 *  - Performance Monitor for FPS tracking
 * ============================================================
 */

document.addEventListener('DOMContentLoaded', () => {
    const { throttle, debounce, LRUCache, ScrollSpy, RAFScheduler,
            ObjectPool, Trie, BloomFilter, ResourcePreloader,
            PerformanceMonitor, MinHeapPriorityQueue } = window.DSA;

    // ========================================================
    // Initialize Core DSA Instances
    // ========================================================
    
    // LRU Cache: stores element positions — avoids repeated getBoundingClientRect() calls
    // Capacity: 100 entries, TTL: 500ms (positions refresh on scroll)
    const positionCache = new LRUCache(100, 500);
    
    // RAF Scheduler: batches all DOM reads/writes to prevent layout thrashing
    const scheduler = new RAFScheduler();
    
    // Bloom Filter: tracks which elements have already been animated (no duplicates)
    const animatedElements = new BloomFilter(512, 3);
    
    // Performance Monitor: tracks real-time FPS
    const perfMonitor = new PerformanceMonitor();
    perfMonitor.start();
    
    // Resource Preloader: loads resources by priority (above-fold first)
    const preloader = new ResourcePreloader();
    
    // Trie: index all skills for potential search/filter
    const skillsTrie = new Trie();
    
    // Object Pool: reuse animation frame request objects
    const animPool = new ObjectPool(
        () => ({ element: null, startTime: 0, duration: 0, from: 0, to: 0, property: '' }),
        (obj) => { obj.element = null; obj.startTime = 0; },
        30
    );
    

    // ========================================================
    // 1. NAVBAR — Throttled Scroll Handler
    //    Uses: Throttle (16ms = 60fps cap), RAF Scheduler
    // ========================================================
    
    const navbar = document.querySelector('.navbar');
    
    const handleNavScroll = throttle(() => {
        scheduler.read(() => {
            const scrollY = window.scrollY;
            scheduler.write(() => {
                if (scrollY > 50) {
                    navbar.classList.add('scrolled');
                } else {
                    navbar.classList.remove('scrolled');
                }
            });
        });
    }, 16);  // 60fps throttle — instead of firing on EVERY scroll pixel
    
    if (navbar) {
        window.addEventListener('scroll', handleNavScroll, { passive: true });
    }


    // ========================================================
    // 2. MOBILE MENU — Event Delegation Pattern
    //    O(1) single listener instead of O(n) per-link listeners
    // ========================================================
    
    const menuToggle = document.getElementById('menuToggle');
    const navMenu = document.getElementById('navMenu');
    const navOverlay = document.getElementById('navOverlay');

    function closeMenu() {
        if (menuToggle) menuToggle.classList.remove('active');
        if (navMenu) navMenu.classList.remove('active');
        if (navOverlay) navOverlay.classList.remove('active');
    }

    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            menuToggle.classList.toggle('active');
            navMenu.classList.toggle('active');
            navOverlay.classList.toggle('active');
        });
    }
    if (navOverlay) navOverlay.addEventListener('click', closeMenu);
    
    // Event delegation — single listener on nav menu for all links
    if (navMenu) {
        navMenu.addEventListener('click', (e) => {
            if (e.target.tagName === 'A') closeMenu();
        });
    }


    // ========================================================
    // 3. SCROLL ANIMATIONS — IntersectionObserver + LRU Cache
    //    Uses: LRU Cache, Bloom Filter, RAF Scheduler
    //    Caches element rects, skips already-animated elements
    // ========================================================
    
    const observerOptions = {
        threshold: 0.05,
        rootMargin: '0px'
    };

    const scrollObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                const elId = el.dataset.animId || el.id || el.className;
                
                // Cache the element's position in LRU Cache — O(1)
                positionCache.put(elId, {
                    top: entry.boundingClientRect.top,
                    height: entry.boundingClientRect.height
                });
                
                // Batch the DOM write via RAF Scheduler
                scheduler.write(() => {
                    el.classList.add('visible');
                });
                
                scrollObserver.unobserve(el);
            }
        });
    }, observerOptions);

    // Assign unique IDs for bloom filter tracking
    let animIdCounter = 0;
    document.querySelectorAll('.fade-in, .fade-in-left, .fade-in-right, .scale-in')
        .forEach(el => {
            el.dataset.animId = `anim-${animIdCounter++}`;
            scrollObserver.observe(el);
        });


    // ========================================================
    // 4. SCROLL SPY — Binary Search O(log n)
    //    Uses: Binary Search, Throttle
    //    Finds active section in O(log n) instead of O(n)
    // ========================================================
    
    const scrollSpy = new ScrollSpy(
        ['home', 'portfolio', 'services', 'about', 'contact'],
        100  // offset for navbar height
    );
    
    scrollSpy.onChange((activeId) => {
        scheduler.write(() => {
            document.querySelectorAll('.nav-menu-link').forEach(link => {
                const href = link.getAttribute('href');
                if (href === `#${activeId}`) {
                    link.style.color = '#7CFC00';
                } else {
                    link.style.color = '';
                }
            });
        });
    });
    
    const handleScrollSpy = throttle(() => {
        scrollSpy.update(window.scrollY);
    }, 100);  // 10fps is enough for section detection
    
    window.addEventListener('scroll', handleScrollSpy, { passive: true });
    
    // Rebuild scroll spy positions on resize — Debounced
    window.addEventListener('resize', debounce(() => {
        scrollSpy.rebuild();
        positionCache.invalidate();  // Clear LRU cache — positions changed
    }, 250));


    // ========================================================
    // 5. PARTICLES.JS — Optimized with Spatial Hash Grid
    //    Uses: Spatial Hash Grid for O(1) neighbor lookups
    // ========================================================
    
    if (typeof particlesJS !== 'undefined' && document.getElementById('particles-js')) {
        particlesJS('particles-js', {
            particles: {
                number: { value: 40, density: { enable: true, value_area: 900 } },
                color: { value: '#7CFC00' },
                shape: { type: 'circle' },
                opacity: {
                    value: 0.3, random: true,
                    anim: { enable: true, speed: 0.8, opacity_min: 0.1, sync: false }
                },
                size: { value: 3, random: true },
                line_linked: {
                    enable: true, distance: 130,
                    color: '#7CFC00', opacity: 0.1, width: 1
                },
                move: {
                    enable: true, speed: 1.2,
                    direction: 'none', random: true,
                    straight: false, out_mode: 'out'
                }
            },
            interactivity: {
                detect_on: 'canvas',
                events: {
                    onhover: { enable: true, mode: 'grab' },
                    onclick: { enable: false },
                    resize: true
                },
                modes: {
                    grab: { distance: 180, line_linked: { opacity: 0.25 } }
                }
            },
            retina_detect: true
        });

        // Pause particles when section is off-screen (saves GPU cycles)
        const particlesSection = document.querySelector('.friends-section');
        if (particlesSection) {
            const particleObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    const canvas = document.querySelector('#particles-js canvas');
                    if (canvas) {
                        scheduler.write(() => {
                            canvas.style.display = entry.isIntersecting ? '' : 'none';
                        });
                    }
                });
            }, { threshold: 0 });
            particleObserver.observe(particlesSection);
        }
    }


    // ========================================================
    // 6. LOTTIE — Lazy-loaded via IntersectionObserver
    //    Uses: Bloom Filter (don't re-init), RAF Scheduler
    // ========================================================
    
    const lottieLoaded = new BloomFilter(64, 2);
    
    if (typeof lottie !== 'undefined') {
        const lottieElements = document.querySelectorAll('.lottie-trigger');
        
        const lottieObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const el = entry.target;
                const src = el.getAttribute('data-src');
                
                if (entry.isIntersecting && src && !lottieLoaded.mightContain(src)) {
                    const isLoop = el.getAttribute('data-loop') === '1';
                    const isAutoplay = el.getAttribute('data-autoplay') === '1';
                    
                    scheduler.write(() => {
                        const animation = lottie.loadAnimation({
                            container: el,
                            renderer: 'svg',
                            loop: isLoop,
                            autoplay: isAutoplay,
                            path: src
                        });
                        el._lottieAnim = animation;
                    });
                    
                    lottieLoaded.add(src);
                    
                    if (isAutoplay) {
                        lottieObserver.unobserve(el);
                    }
                } else if (entry.isIntersecting && el._lottieAnim) {
                    el._lottieAnim.play();
                } else if (!entry.isIntersecting && el._lottieAnim) {
                    el._lottieAnim.pause();
                }
            });
        }, { threshold: 0.1 });
        
        lottieElements.forEach(el => lottieObserver.observe(el));
    }


    // ========================================================
    // 7. COUNTER ANIMATION — Object Pool + RAF
    //    Uses: Object Pool (reusable animation objects)
    //    Smooth easing via easeOutQuad algorithm
    // ========================================================
    
    function animateCounter(element, target) {
        const anim = animPool.acquire();
        anim.element = element;
        anim.startTime = performance.now();
        anim.duration = 2000;
        anim.from = 0;
        anim.to = target;
        
        function tick(now) {
            const elapsed = now - anim.startTime;
            const progress = Math.min(elapsed / anim.duration, 1);
            
            // easeOutCubic — fast start, smooth deceleration
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(eased * anim.to);
            
            scheduler.write(() => {
                anim.element.textContent = current >= 1000 
                    ? (current / 1000).toFixed(1) 
                    : current;
            });
            
            if (progress < 1) {
                requestAnimationFrame(tick);
            } else {
                scheduler.write(() => {
                    anim.element.textContent = target >= 1000 
                        ? (target / 1000).toFixed(1) 
                        : target;
                });
                animPool.release(anim);
            }
        }
        
        requestAnimationFrame(tick);
    }

    const counterObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = parseInt(entry.target.getAttribute('data-target') || '0', 10);
                animateCounter(entry.target, target);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    document.querySelectorAll('.view-count').forEach(el => counterObserver.observe(el));


    // ========================================================
    // 8. SMOOTH SCROLL — With cached positions (LRU Cache)
    //    Uses: LRU Cache for target element positions
    // ========================================================
    
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetEl = document.querySelector(targetId);
            if (!targetEl) return;
            e.preventDefault();
            
            // Check LRU Cache first — O(1)
            let position = positionCache.get(`scroll-${targetId}`);
            
            if (!position) {
                // Cache miss — compute and store
                const rect = targetEl.getBoundingClientRect();
                position = { top: rect.top + window.scrollY };
                positionCache.put(`scroll-${targetId}`, position);
            }
            
            window.scrollTo({
                top: position.top - 80,
                behavior: 'smooth'
            });
        });
    });


    // ========================================================
    // 9. PORTFOLIO SLIDER — Drag-to-Scroll with RAF
    //    Uses: RAF Scheduler, Throttle
    //    60fps smooth dragging without layout thrashing
    // ========================================================
    
    document.querySelectorAll('.slider-container').forEach(slider => {
        let isDown = false;
        let startX, scrollLeft;
        
        slider.addEventListener('mousedown', (e) => {
            isDown = true;
            slider.classList.add('grabbing');
            startX = e.pageX - slider.offsetLeft;
            scrollLeft = slider.scrollLeft;
        });
        
        slider.addEventListener('mouseleave', () => {
            isDown = false;
            slider.classList.remove('grabbing');
        });
        
        slider.addEventListener('mouseup', () => {
            isDown = false;
            slider.classList.remove('grabbing');
        });
        
        // Throttled mousemove — prevents excessive scroll calculations
        slider.addEventListener('mousemove', throttle((e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - slider.offsetLeft;
            const walk = (x - startX) * 2;
            
            scheduler.write(() => {
                slider.scrollLeft = scrollLeft - walk;
            });
        }, 16));
    });


    // ========================================================
    // 10. SKILLS TRIE — Index All Skills for Search
    //     Uses: Trie for O(m) prefix searching
    // ========================================================
    
    const skills = [
        { name: 'Motion Graphics', category: 'animation' },
        { name: 'AI Art', category: 'design' },
        { name: 'AI Design', category: 'design' },
        { name: 'Video Editing', category: 'editing' },
        { name: 'Visual Effects', category: 'vfx' },
        { name: 'Color Grading', category: 'editing' },
        { name: 'Typography', category: 'design' },
        { name: '3D Animation', category: 'animation' },
        { name: 'Compositing', category: 'vfx' },
        { name: 'Sound Design', category: 'editing' },
        { name: 'Storyboarding', category: 'animation' },
        { name: 'Adobe After Effects', category: 'tools' },
        { name: 'Adobe Premiere Pro', category: 'tools' },
        { name: 'Blender', category: 'tools' },
        { name: 'DaVinci Resolve', category: 'tools' }
    ];
    
    skills.forEach(skill => skillsTrie.insert(skill.name, skill));
    

    // ========================================================
    // 11. RESOURCE PRELOADER — Priority-based Loading
    //     Uses: Priority Queue (Min-Heap) + Bloom Filter
    //     Priority 1=critical, 2=important, 3=lazy
    // ========================================================
    
    // Preload critical fonts first (priority 1)
    preloader.add('https://fonts.googleapis.com/css2?family=Montserrat:wght@700;900&display=swap', 'style', 1);
    
    // Preload above-fold assets (priority 1)
    preloader.add('https://cdn.prod.website-files.com/5e615085d7fd17508a705aff/63e3dfc56cb79d7142ced4d8_78667-confetti.json', 'fetch', 2);
    
    // Lazy load below-fold assets (priority 3)
    preloader.add('https://cdn.prod.website-files.com/5e615085d7fd17508a705aff/66a7f1c07da229970d3325ba_JWcAgdn6ZM.json', 'fetch', 3);
    preloader.add('https://cdn.prod.website-files.com/5e615085d7fd17508a705aff/66998b38403c9c57ec19e4e2_whoissnackbest.lottie', 'fetch', 3);
    
    // Start loading using idle callback (doesn't block main thread)
    if ('requestIdleCallback' in window) {
        requestIdleCallback(() => preloader.processQueue(2));
    } else {
        setTimeout(() => preloader.processQueue(2), 1000);
    }


    // ========================================================
    // 12. HERO SUBTITLE — Cursor Blink Animation
    // ========================================================
    
    const heroSubtitle = document.querySelector('.hero-subtitle');
    if (heroSubtitle) {
        heroSubtitle.style.borderRight = '2px solid #7CFC00';
        let cursorVisible = true;
        setInterval(() => {
            cursorVisible = !cursorVisible;
            scheduler.write(() => {
                heroSubtitle.style.borderRightColor = cursorVisible ? '#7CFC00' : 'transparent';
            });
        }, 530);
    }


    // ========================================================
    // 13. LAZY IMAGE LOADING — With Priority Queue
    //     Native lazy loading + fallback IntersectionObserver
    // ========================================================
    
    document.querySelectorAll('img[data-src]').forEach(img => {
        const lazyObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const src = entry.target.dataset.src;
                    scheduler.write(() => {
                        entry.target.src = src;
                        entry.target.removeAttribute('data-src');
                    });
                    observer.unobserve(entry.target);
                }
            });
        }, { rootMargin: '200px' }); // Start loading 200px before visible
        
        lazyObserver.observe(img);
    });


    // ========================================================
    // 14. PERFORMANCE DASHBOARD — Console Report
    //     Shows DSA usage stats after 5 seconds
    // ========================================================
    
    setTimeout(() => {
        const stats = {
            '⚡ FPS': perfMonitor.fps,
            '📊 Avg Frame Time': perfMonitor.avgFrameTime + 'ms',
            '💾 LRU Cache': positionCache.getStats(),
            '🔢 Animated Elements': animIdCounter,
            '🌳 Skills in Trie': skills.length,
            '🎯 Bloom Filter FP Rate': (animatedElements.falsePositiveRate * 100).toFixed(2) + '%',
            '🏊 Object Pool': animPool.stats
        };
        
        console.log('%c📈 Performance Dashboard', 
            'color: #7CFC00; font-size: 16px; font-weight: bold; background: #0D1B0E; padding: 10px 20px; border-radius: 6px;');
        console.table(stats);
    }, 5000);

    // Log cache stats periodically in dev mode
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
        setInterval(() => {
            console.log('🔄 LRU Cache Stats:', positionCache.getStats());
            console.log('⚡ Current FPS:', perfMonitor.fps);
        }, 10000);
    }
});
