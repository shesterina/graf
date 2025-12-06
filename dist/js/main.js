// Плавная прокрутка к секциям
document.addEventListener('DOMContentLoaded', function() {
    // Обработка кликов по навигационным ссылкам
    const navLinks = document.querySelectorAll('.nav-menu a');

    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);

            if (targetSection) {
                targetSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Обработка формы контактов
    const contactForm = document.querySelector('.contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            alert('Спасибо за ваше сообщение! Мы свяжемся с вами в ближайшее время.');
            this.reset();
        });
    }

    // Анимация появления элементов при прокрутке
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Применяем анимацию к карточкам услуг
    const serviceCards = document.querySelectorAll('.service-card');
    serviceCards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(card);
    });

    console.log('Graffics Landing - готов к работе!');

    // Инициализация 3D графика ECharts с данными из JSON
    if (typeof echarts !== 'undefined') {
        const chartContainer = document.getElementById('chart3d');
        const chartRiverContainer = document.getElementById('chartRiver');

        // Общие данные и парсер чисел
        const raw = (typeof chartData !== 'undefined') ? chartData : [];
        const jsonData = Array.isArray(raw) ? raw : [];
        const toNum = (v) => {
            if (v === null || v === undefined) return NaN;
            const s = String(v).replace(',', '.');
            return Number(s);
        };

        // Подготовка данных: общий источник для обоих графиков
        const timeLabels = [];
        const data3d = [];
        const riverData = [];
        const riverPnl = [];
        const riverDd = [];
        const values = [];

        jsonData.forEach((item, index) => {
            const excelDate = item.Date;
            const date = new Date((excelDate - 25569) * 86400 * 1000);
            const isValidDate = isFinite(date) && !isNaN(date.valueOf());
            const dateLabel = isValidDate
                ? date.toLocaleDateString('ru-RU') + ' ' + date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
                : `#${index + 1}`;
            const riverDate = isValidDate
                ? date.toISOString().slice(0, 10).replace(/-/g, '/')
                : '';

            const pnl = toNum(item['PnL Curve, %']);
            const dd = toNum(item['Drawdown Curve, %']);

            timeLabels.push(dateLabel);

            if (Number.isFinite(dd)) {
                const ddRounded = Number(dd.toFixed(2));
                data3d.push([index, 0, ddRounded]);
                values.push(dd);
                if (riverDate) {
                    riverData.push([riverDate, ddRounded, 'Drawdown Curve, %']);
                    riverDd.push([riverDate, ddRounded]);
                }
            }
            if (Number.isFinite(pnl)) {
                const pnlRounded = Number(pnl.toFixed(2));
                data3d.push([index, 1, pnlRounded]);
                values.push(pnl);
                if (riverDate) {
                    riverData.push([riverDate, pnlRounded, 'PnL Curve, %']);
                    riverPnl.push([riverDate, pnlRounded]);
                }
            }
        });

        const hasData = values.length > 0;
        const maxValue = hasData ? Math.max(...values.map(Math.abs)) : 1;
        const minValue = hasData ? Math.min(...values) : 0;

        if (chartContainer) {
            if (!hasData) {
                chartContainer.innerHTML = '<p style="color:#fff;text-align:center;padding:20px;">Нет данных для отображения (все значения нечисловые)</p>';
            } else {
                const myChart = echarts.init(chartContainer, 'dark');
                const option = {
                    title: {
                        text: 'PnL и Drawdown Curve',
                        left: 'center',
                        textStyle: {
                            color: '#fff'
                        }
                    },
                    tooltip: {
                        formatter: function(params) {
                            const metricName = params.data[1] === 0 ? 'Drawdown Curve' : 'PnL Curve';
                            const timeIndex = params.data[0];
                            const value = params.data[2];
                            return `${metricName}<br/>${timeLabels[timeIndex]}<br/>Значение: ${value.toFixed(2)}%`;
                        }
                    },
                    visualMap: {
                        min: minValue,
                        max: maxValue,
                        inRange: {
                            color: ['#313695', '#4575b4', '#74add1', '#abd9e9',
                                    '#e0f3f8', '#ffffbf', '#fee090', '#fdae61',
                                    '#f46d43', '#d73027', '#a50026']
                        }
                    },
                    xAxis3D: {
                        type: 'value',
                        name: 'Время',
                        nameTextStyle: {
                            color: '#fff'
                        }
                    },
                    yAxis3D: {
                        type: 'category',
                        data: ['Drawdown Curve, %', 'PnL Curve, %'],
                        nameTextStyle: {
                            color: '#fff'
                        }
                    },
                    zAxis3D: {
                        type: 'value',
                        name: 'Значение, %',
                        nameTextStyle: {
                            color: '#fff'
                        }
                    },
                    grid3D: {
                        boxWidth: 200,
                        boxDepth: 80,
                        viewControl: {
                            projection: 'orthographic',
                            autoRotate: false,
                            rotateSensitivity: 1,
                            zoomSensitivity: 1,
                            panSensitivity: 1
                        },
                        light: {
                            main: {
                                intensity: 1.2,
                                shadow: true
                            },
                            ambient: {
                                intensity: 0.3
                            }
                        }
                    },
                    series: [{
                        type: 'bar3D',
                        data: data3d,
                        barSize: [4, 4], // уже столбцы/ячейки
                        shading: 'lambert',
                        label: {
                            show: false,
                            fontSize: 16,
                            borderWidth: 1
                        },
                        emphasis: {
                            label: {
                                fontSize: 20,
                                color: '#900'
                            },
                            itemStyle: {
                                color: '#900'
                            }
                        }
                    }]
                };

                myChart.setOption(option);

                // Адаптация размера при изменении окна
                window.addEventListener('resize', function() {
                    myChart.resize();
                    if (chartRiverContainer && chartRiverContainer.__riverChart) {
                        chartRiverContainer.__riverChart.resize();
                    }
                });
            }
        }

        // Второй график: Area chart (чётко виден знак)
        if (chartRiverContainer) {
            if (!hasData) {
                chartRiverContainer.innerHTML = '<p style="color:#fff;text-align:center;padding:20px;">Нет данных для второго графика</p>';
            } else {
                const riverChart = echarts.init(chartRiverContainer, 'dark');
                chartRiverContainer.__riverChart = riverChart;

                const riverOption = {
                    title: {
                        text: 'PnL и Drawdown (линия/площадь)',
                        left: 'center',
                        textStyle: { color: '#fff' }
                    },
                    tooltip: {
                        trigger: 'axis',
                        axisPointer: {
                            type: 'cross'
                        },
                        formatter: function(params) {
                            if (!params || params.length === 0) return '';
                            // Показываем только первую серию (ближайшую к курсору)
                            const item = params[0];
                            const date = item.axisValue;
                            const value = Array.isArray(item.value) ? item.value[1] : item.value;
                            return `${item.marker} ${item.seriesName}<br/>${date}<br/>Значение: ${Number(value).toFixed(2)}%`;
                        }
                    },
                    legend: {
                        top: 24,
                        textStyle: { color: '#fff' }
                    },
                dataZoom: [
                    { type: 'inside', xAxisIndex: 0 },
                    { type: 'slider', xAxisIndex: 0, height: 20, bottom: 12 }
                ],
                    xAxis: {
                        type: 'time',
                        axisLine: { lineStyle: { color: '#ccc' } },
                        axisLabel: { color: '#fff' },
                        splitLine: { show: false }
                    },
                    yAxis: {
                        type: 'value',
                        axisLine: { lineStyle: { color: '#ccc' } },
                        axisLabel: { color: '#fff' },
                        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
                        name: 'Значение, %',
                        nameTextStyle: { color: '#fff' }
                    },
                    color: ['#74add1', '#f46d43'],
                    series: [
                        {
                            name: 'PnL Curve, %',
                            type: 'line',
                            smooth: true,
                            showSymbol: false,
                            areaStyle: { opacity: 0.3 },
                            data: riverPnl
                        },
                        {
                            name: 'Drawdown Curve, %',
                            type: 'line',
                            smooth: true,
                            showSymbol: false,
                            areaStyle: { opacity: 0.3 },
                            data: riverDd
                        }
                    ]
                };

                riverChart.setOption(riverOption);
            }
        }
    } else {
        console.warn('ECharts не загружен. Проверьте подключение скрипта.');
    }
});

