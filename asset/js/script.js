
document.addEventListener('DOMContentLoaded', () => {
    const iframe = document.getElementById('content-iframe');
    const sidebar = document.getElementById('sidebar');
    const panels = document.querySelectorAll('.popup-panel');
    const chapterLinks = Array.from(document.querySelectorAll('.chapter-list a'));
    let currentChapterIndex = -1;
    let originalChapterContent = ''; // Lưu nội dung gốc khi bắt đầu tìm kiếm/highlight
    let isHighlightingMode = false;

    // Cần đảm bảo hàm toggleSection tồn tại vì nó được gọi từ HTML
    window.toggleSection = (id) => {
        const list = document.getElementById(id);
        if (list) {
            list.classList.toggle('show');
        }
    };

    // --- HỆ THỐNG TOAST (MỚI) ---
    const showToast = (message, isError = false) => {
        const toast = document.getElementById('appToast');
        toast.textContent = message;
        toast.style.backgroundColor = isError ? '#e74c3c' : '#2ecc71';
        toast.style.display = 'block';
        toast.style.opacity = '1';
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.style.display = 'none', 300);
        }, 3000);
    };

    // --- LƯU TRỮ ---
    let bookmarks = JSON.parse(localStorage.getItem('ebook_bookmarks_v2')) || [];
    let highlights = JSON.parse(localStorage.getItem('ebook_highlights_v1')) || [];
    let readerSettings = JSON.parse(localStorage.getItem('ebook_settings_v2')) || {
        bgColor: '#FFFFFF', textColor: '#111827', fontSize: '18px', fontFamily: "'Merriweather', Georgia, serif"
    };
    const saveSettings = () => localStorage.setItem('ebook_settings_v2', JSON.stringify(readerSettings));
    const saveBookmarks = () => localStorage.setItem('ebook_bookmarks_v2', JSON.stringify(bookmarks));
    const saveHighlights = () => localStorage.setItem('ebook_highlights_v1', JSON.stringify(highlights));

    // --- HÀM ÁP DỤNG CÀI ĐẶT ---
    const applySettings = () => {
        try {
            const iframeDoc = iframe.contentDocument.documentElement;
            iframeDoc.style.backgroundColor = readerSettings.bgColor;
            iframeDoc.style.color = readerSettings.textColor;
            iframeDoc.style.fontSize = readerSettings.fontSize;
            iframeDoc.style.fontFamily = readerSettings.fontFamily;

            // Cập nhật màu sidebar
            if (readerSettings.bgColor === '#181818') {
                sidebar.style.backgroundColor = '#2c3e50';
                sidebar.style.color = '#e0e0e0';
                // Đảm bảo Mục lục trong Panel cũng đổi màu (phần list panel)
                document.getElementById('tab-toc').style.backgroundColor = '#2c3e50';
            } else {
                sidebar.style.backgroundColor = '#e0f0ff';
                sidebar.style.color = '#1d3557';
                document.getElementById('tab-toc').style.backgroundColor = 'transparent';
            }
        } catch (e) { /* ignore */ }
    };

    // --- LOGIC HIGHLIGHT (CỐ ĐỊNH) ---
    const highlightPanel = document.getElementById('highlightPanel');
    let selectedColor = '#ffdd71'; // Màu highlight mặc định

    // Ẩn panel khi click ra ngoài (trong iframe)
    const hideHighlightPanel = () => highlightPanel.style.display = 'none';

    const getCurrentChapterUrl = () => {
        try {
            // Sử dụng pathname để loại bỏ domain/cổng
            return iframe.contentWindow.location.pathname.split('/').pop();
        } catch (e) {
            // Trả về src mặc định nếu có lỗi (ví dụ: đang ở trang bìa)
            return iframe.getAttribute('src');
        }
    };

    const wrapSelectedText = (color, remove = false) => {
        const iframeWin = iframe.contentWindow;
        const selection = iframeWin.getSelection();

        if (!selection || selection.isCollapsed) {
            if (!remove) showToast('Vui lòng bôi đen đoạn văn bản bạn muốn đánh dấu.', true);
            return false;
        }

        try {
            const range = selection.getRangeAt(0);
            const selectedText = range.toString().trim();
            const currentUrl = getCurrentChapterUrl();

            if (!selectedText) return false;

            if (remove) {
                // Xóa highlight: Tìm và xóa highlight trong mảng lưu trữ
                const initialLength = highlights.length;
highlights = highlights.filter(h => {
    if (h.url !== currentUrl) return true;

    const hText = h.text.trim();
    const sText = selectedText.trim();

    // Nếu đoạn chọn bao chứa hoặc bị chứa trong highlight thì xóa
    const shouldRemove =
        hText.includes(sText) ||
        sText.includes(hText);

    return !shouldRemove;
});
                if (highlights.length !== initialLength) {
                    saveHighlights();
                    // Tải lại nội dung để xóa mark trên DOM
                    loadHighlights(true);
                    showToast('Đã xóa đánh dấu.', false);
                } else {
                    showToast('Không tìm thấy đánh dấu nào để xóa trong đoạn đã chọn.', true);
                    return false;
                }
            } else {
                // Thêm highlight: Bọc văn bản bằng thẻ <mark> và lưu vào storage
                const span = iframeWin.document.createElement('mark');
                span.style.backgroundColor = color;
                span.style.color = 'inherit';

                // Cần kiểm tra xem có đang highlight lại đoạn đã highlight không
                const isAlreadyHighlighted = highlights.some(h => h.url === currentUrl && h.text.trim() === selectedText.trim());
                if (isAlreadyHighlighted) {
                    showToast('Đoạn này đã được đánh dấu.', true);
                    return false;
                }

                // Tạm thời bọc nội dung được chọn
                range.surroundContents(span);
                selection.removeAllRanges();

                // Lưu highlight
                highlights.push({ url: currentUrl, text: selectedText, color: color });
                saveHighlights();
                showToast(`Đã đánh dấu.`);
            }
        } catch (error) {
            // Thường xảy ra khi chọn văn bản ở ranh giới node (vd: giữa 2 thẻ p)
            showToast('Không thể đánh dấu đoạn văn bản đã chọn. Vui lòng thử lại với đoạn ngắn hơn.', true);
        }
        return true;
    };

    // Thêm sự kiện cho các nút chọn màu
    document.querySelectorAll('.highlight-option').forEach(btn => {
        btn.addEventListener('click', function () {
            selectedColor = this.dataset.color;
            document.querySelectorAll('.highlight-option').forEach(o => o.classList.remove('active'));
            this.classList.add('active');
            wrapSelectedText(selectedColor); // Thực hiện highlight
            hideHighlightPanel(); // Luôn ẩn panel sau khi chọn màu
        });
    });

    document.getElementById('clearHighlightBtn').addEventListener('click', function () {
        // Xóa highlight dựa trên đoạn văn bản được chọn
        wrapSelectedText(selectedColor, true);
        hideHighlightPanel();
    });

    // Toggle chế độ highlight
    document.getElementById('highlightBtn').addEventListener('click', () => {
        isHighlightingMode = !isHighlightingMode;
        document.getElementById('highlightBtn').classList.toggle('selected', isHighlightingMode);
        showToast(isHighlightingMode ? 'Chế độ đánh dấu đang BẬT. Chọn văn bản để đánh dấu.' : 'Chế độ đánh dấu đang TẮT.');
    });

    const loadHighlights = (forceReload = false) => {
        try {
            const currentUrl = getCurrentChapterUrl();
            const currentHighlights = highlights.filter(h => h.url === currentUrl);
            const doc = iframe.contentDocument;

            // Khôi phục nội dung gốc trước khi áp dụng lại highlight cố định
            if (forceReload && originalChapterContent) {
                doc.body.innerHTML = originalChapterContent;
            }

            if (currentHighlights.length === 0) return;

            let content = doc.body.innerHTML;

            currentHighlights.forEach(h => {
                const escapedText = h.text.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                // Regex để tìm và thay thế, tránh lồng nhau và chỉ thay thế văn bản trần
                // (?![^<>]*>) : Lookahead âm tính, đảm bảo văn bản không nằm trong tag HTML
                const regex = new RegExp(`(?![^<>]*>)\\b(${escapedText})\\b(?![^<]*<\/)`, 'gi');

                // Chỉ thay thế nếu đoạn văn bản chưa được bọc trong thẻ <mark>
                content = content.replace(regex, (match) => {
                    // Kiểm tra lại lần nữa để tránh highlight lồng nhau
                    if (match.startsWith('<mark')) return match;
                    return `<mark style="background-color: ${h.color};">${match}</mark>`;
                });
            });

            doc.body.innerHTML = content;
            doc.body.dataset.highlightsLoaded = 'true';
        } catch (e) {
            console.error("Lỗi khi tải highlight:", e);
        }
    };
    // --- KẾT THÚC LOGIC HIGHLIGHT ---

    const updateReadingProgress = () => {
        try {
            const scrollable = iframe.contentDocument.documentElement;
            const percent = Math.round((scrollable.scrollTop / (scrollable.scrollHeight - scrollable.clientHeight)) * 100) || 0;
            document.getElementById('progress-fill').style.width = `${percent}%`;
            document.getElementById('progress-text').textContent = `${percent}%`;
        } catch (e) { /* ignore */ }
    };

    const updateNavigation = () => {
        const currentSrc = getCurrentChapterUrl();
        currentChapterIndex = chapterLinks.findIndex(link => link.href.split('/').pop() === currentSrc);
        document.getElementById('prevBtn').disabled = currentChapterIndex <= 0;
        document.getElementById('nextBtn').disabled = currentChapterIndex >= chapterLinks.length - 1 || currentChapterIndex < 0;

        // Cập nhật link active trong cả sidebar và panel mục lục
        document.querySelectorAll('.chapter-list a.active, #tab-toc a.active').forEach(a => a.classList.remove('active'));
        if (currentChapterIndex > -1) {
            chapterLinks[currentChapterIndex].classList.add('active');
            // Cần tìm link tương ứng trong list panel để active
            const targetHref = chapterLinks[currentChapterIndex].getAttribute('href');
            const activeTocLink = document.querySelector(`#tab-toc a[href='${targetHref}']`);
            if (activeTocLink) activeTocLink.classList.add('active');
        }
    };

    // --- HÀM DỌN DẸP HIGHLIGHT TÌM KIẾM ---
    const clearSearchHighlights = () => {
        try {
            const doc = iframe.contentDocument;
            // Chỉ khôi phục nội dung gốc nếu nó đã được lưu và đang ở chế độ đọc
            if (doc && doc.body && originalChapterContent) {
                doc.body.innerHTML = originalChapterContent;
                loadHighlights(false); // Áp dụng lại highlight cố định
                // Xóa thông báo tìm kiếm
                document.getElementById('searchResultsInfo').textContent = 'Chỉ tìm kiếm trong chương đang đọc.';
            }
        } catch (e) {
            console.error("Lỗi khi xóa highlight tìm kiếm:", e);
        }
    };

    const closeAllPanels = () => {
        panels.forEach(p => {
            // Nếu đóng panel tìm kiếm, dọn dẹp highlight tìm kiếm
            if (p.id === 'searchPanel' && p.classList.contains('active')) {
                clearSearchHighlights();
            }
            p.classList.remove('active');
        });
        // Ẩn luôn panel highlight nếu đang mở
        hideHighlightPanel();
    };
    const togglePanel = (panelId) => {
        const panel = document.getElementById(panelId);
        const isActive = panel.classList.contains('active');
        closeAllPanels();
        if (!isActive) panel.classList.add('active');
    };

    // --- SỰ KIỆN CHUNG ---
    document.getElementById('prevBtn').addEventListener('click', () => {
        if (currentChapterIndex > 0) iframe.src = chapterLinks[currentChapterIndex - 1].href;
    });
    document.getElementById('nextBtn').addEventListener('click', () => {
        if (currentChapterIndex < chapterLinks.length - 1) iframe.src = chapterLinks[currentChapterIndex + 1].href;
    });
    // Cập nhật để trang chủ là link đầu tiên của chương đầu tiên
    document.getElementById('homeBtn').addEventListener('click', () => iframe.src = chapterLinks[0].href);
    document.getElementById('sidebarToggleBtn').addEventListener('click', () => sidebar.classList.toggle('hidden'));
    panels.forEach(panel => panel.querySelector('.close-btn')?.addEventListener('click', closeAllPanels));

    // --- CÀI ĐẶT ---
    const settingsPanel = document.getElementById('settingsPanel');
    const updateSettingsUI = () => {
        settingsPanel.querySelectorAll('.color-option').forEach(opt => opt.classList.toggle('selected', opt.dataset.bg === readerSettings.bgColor));


        settingsPanel.querySelectorAll('.color-option-text')
            .forEach(opt => opt.classList.toggle('selected-text', opt.dataset.text === readerSettings.textColor));
        settingsPanel.querySelector('#fontSizeSlider').value = parseInt(readerSettings.fontSize);
        settingsPanel.querySelector('#fontFamilySelect').value = readerSettings.fontFamily;
    };
    document.getElementById('settingsBtn').addEventListener('click', () => { togglePanel('settingsPanel'); updateSettingsUI(); });
    settingsPanel.querySelectorAll('.color-option').forEach(opt => opt.addEventListener('click', function () {
        readerSettings.bgColor = this.dataset.bg; applySettings(); saveSettings(); updateSettingsUI();
    }));
    settingsPanel.querySelectorAll('.color-option-text').forEach(opt =>
        opt.addEventListener('click', function () {
            readerSettings.textColor = this.dataset.text;
            applySettings();
            saveSettings();
            updateSettingsUI();
        })
    );
    settingsPanel.querySelector('#fontSizeSlider').addEventListener('input', function () {
        readerSettings.fontSize = this.value + 'px'; applySettings(); saveSettings();
    });
    settingsPanel.querySelector('#fontFamilySelect').addEventListener('change', function () {
        readerSettings.fontFamily = this.value; applySettings(); saveSettings();
    });

    // --- TÌM KIẾM ĐÃ SỬA (FIXED) ---
    const searchInput = document.getElementById('searchInput');
    const searchResultsInfo = document.getElementById('searchResultsInfo');

    // Hàm escape ký tự đặc biệt để tạo regex an toàn
const escapeRegExp = (s) => s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');

// Hàm duyệt từng text node và highlight
const highlightSearchInDoc = (doc, searchTerm) => {
    if (!searchTerm) return 0;

    const regex = new RegExp(escapeRegExp(searchTerm), 'giu'); // g: toàn bộ, i: không phân biệt hoa thường, u: hỗ trợ Unicode
    let matchCount = 0;

    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, {
        acceptNode: function(node) {
            if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
            if (node.parentNode.closest('mark')) return NodeFilter.FILTER_REJECT;
            const tag = node.parentNode.nodeName.toLowerCase();
            if (tag === 'script' || tag === 'style') return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
        }
    });

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach(textNode => {
        const text = textNode.nodeValue;
        const parent = textNode.parentNode;
        const frag = doc.createDocumentFragment();
        let lastIndex = 0, m;
        let anyMatch = false;

        regex.lastIndex = 0;
        while ((m = regex.exec(text)) !== null) {
            anyMatch = true;
            if (m.index > lastIndex)
                frag.appendChild(doc.createTextNode(text.slice(lastIndex, m.index)));

            const mark = doc.createElement('mark');
            mark.style.backgroundColor = 'yellow';
            mark.textContent = m[0];
            frag.appendChild(mark);
            matchCount++;
            lastIndex = m.index + m[0].length;
        }

        if (anyMatch) {
            if (lastIndex < text.length)
                frag.appendChild(doc.createTextNode(text.slice(lastIndex)));
            parent.replaceChild(frag, textNode);
        }
    });

    return matchCount;
};


const performSearch = () => {
    clearSearchHighlights(); // Xóa highlight cũ

    const searchTerm = searchInput.value.trim();
    const doc = iframe.contentDocument;

    if (!doc || !doc.body) {
        searchResultsInfo.textContent = 'Không thể truy cập nội dung chương.';
        return;
    }

    if (!searchTerm) {
        searchResultsInfo.textContent = 'Vui lòng nhập từ khóa cần tìm.';
        return;
    }

    const currentUrl = getCurrentChapterUrl();
    if (currentUrl === 'Bìa.html' || currentUrl === '') {
        searchResultsInfo.textContent = 'Không thể tìm kiếm ở trang bìa.';
        return;
    }

    // Phục hồi nội dung gốc trước khi tìm
    if (originalChapterContent)
        doc.body.innerHTML = originalChapterContent;

    // Áp lại các highlight cố định
    loadHighlights(false);

    // Thực hiện tìm kiếm
    const found = highlightSearchInDoc(doc, searchTerm);

    if (found > 0) {
        searchResultsInfo.textContent = `Tìm thấy ${found} kết quả.`;
        const first = doc.body.querySelector('mark');
        if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
        searchResultsInfo.textContent = `Không tìm thấy từ khóa "${searchTerm}" nào.`;
    }
};


    document.getElementById('searchBtn').addEventListener('click', () => togglePanel('searchPanel'));
    document.getElementById('performSearchBtn').addEventListener('click', performSearch);
    document.getElementById('clearSearchBtn').addEventListener('click', clearSearchHighlights); // Gắn sự kiện xóa
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });

    // --- DẤU TRANG ---
    const listPanel = document.getElementById('listPanel');
    const bookmarksList = document.getElementById('bookmarksList');

    const renderBookmarks = () => {
        bookmarksList.innerHTML = '';
        bookmarks.forEach((b, index) => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${b.title}</span> <button class="delete-bookmark" data-index="${index}">&times;</button>`;
            li.addEventListener('click', (e) => {
                if (!e.target.classList.contains('delete-bookmark')) {
                    iframe.src = './Chương/' +b.url;
                    closeAllPanels();
                }
            });
            bookmarksList.appendChild(li);
        });
        document.querySelectorAll('.delete-bookmark').forEach(btn => {
            btn.addEventListener('click', function () {
                const index = parseInt(this.dataset.index);
                bookmarks.splice(index, 1);
                saveBookmarks();
                renderBookmarks();
                showToast('Đã xóa dấu trang.');
            });
        });
    };

    const addBookmark = () => {
        const currentUrl = getCurrentChapterUrl();
        const currentTitle = chapterLinks[currentChapterIndex] ? chapterLinks[currentChapterIndex].textContent.trim() : "Trang đang đọc";

        if (bookmarks.some(b => b.url === currentUrl)) {
            showToast('Trang này đã được đánh dấu rồi.', true);
            return;
        }

        bookmarks.push({ url: currentUrl, title: currentTitle, date: new Date().toLocaleString('vi-VN') });
        saveBookmarks();
        renderBookmarks();
        showToast('Đã thêm dấu trang.');
    };

    document.getElementById('bookmarkBtn').addEventListener('click', addBookmark);

    document.getElementById('listBtn').addEventListener('click', () => {
        togglePanel('listPanel');
        renderBookmarks(); // Cập nhật lại list mỗi khi mở
    });

    // --- CHUYỂN TAB TRONG LIST PANEL ---
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            document.getElementById(this.dataset.tab).classList.add('active');
        });
    });

    // --- KHỞI TẠO MỤC LỤC TRONG PANEL ---
    document.getElementById('tab-toc').innerHTML = sidebar.innerHTML;
    // Bỏ các sự kiện onclick JS trong panel để dùng sự kiện load iframe
    document.getElementById('tab-toc').querySelectorAll('.section-title').forEach(el => el.removeAttribute('onclick'));


    // --- SỰ KIỆN LOAD IFRAME ---
    iframe.addEventListener('load', () => {
        applySettings();
        updateNavigation();
        updateReadingProgress();

        // Xóa highlightPanel trước khi gắn lại sự kiện
        iframe.contentWindow.removeEventListener('scroll', updateReadingProgress);
        iframe.contentWindow.removeEventListener('mouseup', handleIframeMouseUp);
        iframe.contentWindow.removeEventListener('mousedown', hideHighlightPanel);

        // Gắn lại sự kiện
        iframe.contentWindow.addEventListener('scroll', updateReadingProgress);
        iframe.contentWindow.addEventListener('mouseup', handleIframeMouseUp);
        // Gắn sự kiện mousedown vào body của iframe để ẩn panel khi click
        iframe.contentDocument.body.addEventListener('mousedown', hideHighlightPanel);

        // Lấy và lưu nội dung gốc sau khi load
        try {
            // IMPORTANT: Cần loại bỏ các thẻ <mark> (cả search và highlight cố định) trước khi lưu nội dung gốc,
            // sau đó áp dụng lại highlight cố định bằng loadHighlights(false).
            const doc = iframe.contentDocument;
            const tempBody = doc.body.cloneNode(true);

            // Loại bỏ tất cả highlight (bao gồm cả highlight cố định và highlight tìm kiếm)
            tempBody.querySelectorAll('mark').forEach(m => {
                const parent = m.parentNode;
                while (m.firstChild) parent.insertBefore(m.firstChild, m);
                parent.removeChild(m);
            });
            // Lưu nội dung đã được làm sạch để dùng cho chức năng search/highlight
            originalChapterContent = tempBody.innerHTML;
        } catch (e) {
            originalChapterContent = '';
            console.error("Lỗi khi lưu nội dung gốc:", e);
        }
        loadHighlights(); // Tải highlight cố định sau khi nội dung gốc đã được lưu
        clearSearchHighlights(); // Đảm bảo search highlight bị xóa khi chuyển chương
    });

    const handleIframeMouseUp = () => {
        // Đợi 100ms để đảm bảo selection đã được tạo
        setTimeout(() => {
            if (!isHighlightingMode) {
                hideHighlightPanel();
                return;
            }
            const selection = iframe.contentWindow.getSelection();
            // Kiểm tra nếu có bôi đen văn bản
            if (selection && selection.toString().trim().length > 0) {
                // Show highlight panel
                highlightPanel.style.display = 'flex';
            } else {
                hideHighlightPanel();
            }
        }, 100);
    };

    // --- CHẠY LẦN ĐẦU ---
    updateSettingsUI();
    applySettings();
    updateNavigation(); // Cập nhật trạng thái nút Prev/Next ban đầu
});