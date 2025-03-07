(function(){
    const canvas = document.getElementById('calendarCanvas');
    const ctx = canvas.getContext('2d');
    let width, height;
  
    // Title element update
    const titleEl = document.getElementById('title');
  
    // Get current date and year details
    const today = new Date();
    const currentYear = today.getFullYear();
    const daysInYear = (new Date(currentYear, 1, 29).getMonth() === 1) ? 366 : 365;
  
    // Returns an ordinal string (e.g., "7th")
    function getOrdinal(n) {
      const s = ["th", "st", "nd", "rd"],
            v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    }
  
    // Update the title.
    // In year view: "Today is Friday, the 7th of March 2025"
    // In month view, the month part is styled in grey (smaller & lighter)
    // with a puke icon above the month name.
    function updateTitle() {
      const dayOfYear = Math.floor((today - new Date(currentYear, 0, 1)) / (24 * 60 * 60 * 1000)) + 1;
      const ordinalDay = getOrdinal(dayOfYear);
      
      let text;
      if (monthMode) {
        const dayOfMonth = today.getDate();
        const ordinalDayOfMonth = getOrdinal(dayOfMonth);
        const monthName = today.toLocaleString("default", { month: 'long' });
        text = `<span style="color:#85B800; background-color:#85B800; padding: 2px 8px; border-radius: 4px; font-size:16px; font-weight:300; position:relative; display:inline-block; color: #000;">${monthName}<span style="position:absolute; top:-1.2em; left:50%; transform:translateX(-50%);">🤮</span></span> ${ordinalDayOfMonth}, ${currentYear}`;
      } else {
        text = `${ordinalDay}, ${currentYear}`;
      }
      titleEl.innerHTML = text;
    }
  
    // Build an array of day objects for the current year.
    const days = [];
    for (let i = 0; i < daysInYear; i++) {
      const d = new Date(currentYear, 0, i + 1);
      days.push({
        date: d,
        x: 0, y: 0, tx: 0, ty: 0,
        month: d.getMonth(),
        dayOfMonth: d.getDate(),
      });
    }
  
    // Year view settings
    const gridCols = 20;
    let gridRows = Math.ceil(daysInYear / gridCols);
    let offsetX = 0;
    let offsetY = 0;
  
    // For month view, we'll store month label layout info.
    const monthLayouts = new Array(12);
    
    // Global day square size (computed once so it remains constant in both views)
    let daySquareSize = 0;

    function drawRoundedRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.fill();
    }
  
    // Compute layouts for both views.
    function computeLayouts() {
      // --- Year View ---
      gridRows = Math.ceil(daysInYear / gridCols);
      const baseSizeYear = Math.min(width / gridCols, height / gridRows);
      daySquareSize = 0.4 * baseSizeYear;
      const gap = daySquareSize * 0.2;  // Define consistent gap size
      
      const totalGridWidth = gridCols * (daySquareSize + gap);
      const totalGridHeight = gridRows * (daySquareSize + gap);
      offsetX = (width - totalGridWidth) / 2;
      offsetY = (height - totalGridHeight) / 2;
      days.forEach((day, i) => {
        const col = i % gridCols;
        const row = Math.floor(i / gridCols);
        day.yearView = {
          x: offsetX + col * (daySquareSize + gap),
          y: offsetY + row * (daySquareSize + gap),
          size: daySquareSize
        };
      });
  
      // --- Month View ---
      const monthCols = 3, monthRows = 4;
      // Increase block sizes by 1.2x to account for gaps
      const blockW = 8 * (daySquareSize + gap);  // Changed from 8 * daySquareSize
      const blockH = 7 * (daySquareSize + gap);  // Changed from 7 * daySquareSize

      const totalWidth = monthCols * blockW + (monthCols - 1) * gap;
      const totalHeight = monthRows * blockH + (monthRows - 1) * gap;

      const monthOffsetX = (width - totalWidth) / 2;
      const monthOffsetY = (height - totalHeight) / 2;

      const monthLabelFontSize = 16, labelHeight = 20;
      const gridOffsetX = daySquareSize / 2;
      const gridOffsetY = labelHeight + (daySquareSize - labelHeight) / 2;

      for (let m = 0; m < 12; m++) {
        const monthDays = days.filter(d => d.month === m);
        const col = m % monthCols;
        const row = Math.floor(m / monthCols);
        const monthX = monthOffsetX + col * (blockW + gap);
        const monthY = monthOffsetY + row * (blockH + gap);
        
        // Save month label layout
        monthLayouts[m] = {
            labelX: monthX + blockW / 2,
            labelY: monthY + (labelHeight - monthLabelFontSize) / 2,
            fontSize: monthLabelFontSize,
            color: "#888"
        };

        // Update the day placement to use consistent gap
        monthDays.forEach((day, index) => {
          const dcol = index % 7;
          const drow = Math.floor(index / 7);
          day.monthView = {
            x: monthX + gridOffsetX + dcol * (daySquareSize + gap),
            y: monthY + gridOffsetY + drow * (daySquareSize + gap),
            size: daySquareSize
          };
        });
      }
    }
  
    // Resize handler: update canvas dimensions and layouts.
    function resize() {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      computeLayouts();
      draw();
    }
    window.addEventListener('resize', resize);
  
    // Current mode: false = year view, true = month view.
    let monthMode = false;
    document.getElementById('toggleView').addEventListener('change', (e) => {
      monthMode = e.target.checked;
      updateTitle();
      startAnimation();
    });
  
    // Animation settings
    const animDuration = 500; // milliseconds
    let animStartTime = null;
  
    // Initialize positions to year view after layouts have been computed.
    function initPositions() {
      days.forEach(day => {
        day.x = day.yearView.x;
        day.y = day.yearView.y;
        day.size = day.yearView.size;
      });
    }
  
    // Animate transition between views.
    function startAnimation() {
      animStartTime = performance.now();
      days.forEach(day => {
        const target = monthMode ? day.monthView : day.yearView;
        day.startX = day.x;
        day.startY = day.y;
        day.tx = target.x;
        day.ty = target.y;
      });
      requestAnimationFrame(animate);
    }
  
    function animate(now) {
      const elapsed = now - animStartTime;
      const t = Math.min(1, elapsed / animDuration);
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      days.forEach(day => {
        day.x = day.startX + (day.tx - day.startX) * ease;
        day.y = day.startY + (day.ty - day.startY) * ease;
      });
      draw();
      if (t < 1) {
        requestAnimationFrame(animate);
      }
    }
  
    // Draw the calendar and month labels (if in month view).
    function draw() {
      ctx.clearRect(0, 0, width, height);
      days.forEach(day => {
        let fillColor;
        if (day.date.toDateString() === today.toDateString()) {
          fillColor = "#888";  // current day
        } else if (day.date < today) {
          fillColor = "#555";  // past days
        } else {
          fillColor = "#222";  // future days
        }
        ctx.fillStyle = fillColor;
        drawRoundedRect(ctx, day.x, day.y, day.size, day.size, day.size * .2);
      });
  
      // Draw month labels in month view.
      if (monthMode) {
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        for (let m = 0; m < 12; m++) {
          const monthName = new Date(currentYear, m).toLocaleString("default", { month: "long" });
          const layout = monthLayouts[m];
          ctx.font = `${layout.fontSize}px sans-serif`;  // lighter font can be simulated if available
          ctx.fillStyle = layout.color;
          ctx.fillText(monthName, layout.labelX, layout.labelY);
        }
      }
    }
  
    // Initial setup: compute layouts, initialize positions, update title, and draw.
    resize();
    initPositions();
    updateTitle();
    draw();
  })();