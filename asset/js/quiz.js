/* --- LOGIC CHẤM ĐIỂM QUIZ --- */

function chamDiem() {
    let diem = 0;
    const questions = document.querySelectorAll('.question-card');
    let tongSoCau = questions.length;

    for (let i = 1; i <= tongSoCau; i++) {
        let qID = "q" + i;
        let inputs = document.getElementsByName(qID);
        let resultBox = document.getElementById("res-" + qID);
        
        // Lấy đáp án đúng từ biến global dapAn được định nghĩa trong mỗi chương
        let dapAnDung = typeof dapAn !== 'undefined' ? dapAn[qID] : null;
        
        if (!dapAnDung) continue;

        let nguoiDungChon = [];
        
        resultBox.style.display = "block";
        resultBox.className = "result-text";
        
        // Reset styles
        for (let inp of inputs) {
            inp.parentElement.classList.remove("correct-style", "wrong-style");
            if (inp.checked) nguoiDungChon.push(inp.value);
        }

        let isCorrect = false;

        if (Array.isArray(dapAnDung)) {
            // Trường hợp có nhiều đáp án đúng (checkbox)
            if (nguoiDungChon.length === dapAnDung.length) {
                isCorrect = nguoiDungChon.every(val => dapAnDung.includes(val));
            }

            if (nguoiDungChon.length === 0) {
                resultBox.innerHTML = " Bạn chưa chọn đáp án nào.";
                resultBox.style.color = "#d35400";
            } else if (isCorrect) {
                diem++;
                resultBox.innerHTML = " Chính xác!";
                resultBox.className += " correct-style";
                for (let val of nguoiDungChon) {
                    let matchingInput = document.querySelector(`input[name="${qID}"][value="${val}"]`);
                    if (matchingInput) matchingInput.parentElement.classList.add("correct-style");
                }
            } else {
                resultBox.innerHTML = " Sai rồi. Đáp án đúng là: " + dapAnDung.join(", ");
                resultBox.className += " wrong-style";
                for (let val of nguoiDungChon) {
                    let matchingInput = document.querySelector(`input[name="${qID}"][value="${val}"]`);
                    if (matchingInput) matchingInput.parentElement.classList.add("wrong-style");
                }
            }
        } else {
            // Trường hợp 1 đáp án đúng (radio)
            let val = nguoiDungChon[0];
            if (!val) {
                resultBox.innerHTML = " Bạn chưa chọn đáp án.";
                resultBox.style.color = "#d35400";
            } else if (val === dapAnDung) {
                diem++;
                resultBox.innerHTML = " Chính xác!";
                resultBox.className += " correct-style";
                let matchingInput = document.querySelector(`input[name="${qID}"][value="${val}"]`);
                if (matchingInput) matchingInput.parentElement.classList.add("correct-style");
            } else {
                resultBox.innerHTML = " Sai rồi. Đáp án đúng là: " + dapAnDung;
                resultBox.className += " wrong-style";
                let matchingInput = document.querySelector(`input[name="${qID}"][value="${val}"]`);
                if (matchingInput) matchingInput.parentElement.classList.add("wrong-style");
            }
        }
    }

    // Hiển thị kêt quả qua Dialog thay vì Alert
    showQuizDialog(diem, tongSoCau);
}

function showQuizDialog(score, total) {
    let overlay = document.getElementById('quiz-result-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'quiz-result-overlay';
        overlay.className = 'quiz-overlay';
        overlay.innerHTML = `
            <div class="quiz-dialog">
                <div class="note-form-header">
                    <h3 id="quiz-dialog-title">KẾT QUẢ BÀI LÀM</h3>
                    <button class="close-btn" onclick="closeQuizDialog()"><i class="fa-solid fa-xmark"></i></button>
                </div>
                <div class="note-form-body">
                    <div class="score-value" id="quiz-dialog-score">0/0</div>
                    <div class="message" id="quiz-dialog-message">Hãy cố gắng hơn nhé!</div>
                </div>
                <div class="note-form-footer">
                    <button class="btn-close-quiz" onclick="closeQuizDialog()">ĐÓNG</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    const titleEl = document.getElementById('quiz-dialog-title');
    const scoreEl = document.getElementById('quiz-dialog-score');
    const messageEl = document.getElementById('quiz-dialog-message');

    scoreEl.textContent = `${score}/${total}`;
    
    if (score === total) {
        titleEl.textContent = "TUYỆT VỜI! 🌟";
        titleEl.style.color = "#27ae60";
        messageEl.textContent = "Bạn đã trả lời đúng tuyệt đối tất cả các câu hỏi!";
        // Bắn pháo hoa
        triggerConfetti();
    } else if (score >= total / 2) {
        titleEl.textContent = "KHÁ TỐT! 👍";
        titleEl.style.color = "#3498db";
        messageEl.textContent = "Bạn đã nắm vững phần lớn kiến thức rồi đấy.";
        triggerSimpleConfetti();
    } else {
        titleEl.textContent = "CỐ GẮNG LÊN! 💪";
        titleEl.style.color = "#8b1b1d";
        messageEl.textContent = "Hãy đọc kỹ lại nội dung chương và thử lại nhé.";
    }

    overlay.classList.add('show');
}

function closeQuizDialog() {
    const overlay = document.getElementById('quiz-result-overlay');
    if (overlay) {
        overlay.classList.remove('show');
    }
}

function triggerConfetti() {
    var duration = 5 * 1000;
    var end = Date.now() + duration;

    (function frame() {
        confetti({
            particleCount: 5,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ['#ff4500', '#27ae60', '#3498db', '#f1c40f']
        });
        confetti({
            particleCount: 5,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ['#ff4500', '#27ae60', '#3498db', '#f1c40f']
        });

        if (Date.now() < end) {
            requestAnimationFrame(frame);
        }
    }());
}

function triggerSimpleConfetti() {
    confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
    });
}
