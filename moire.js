(function() {
	if (!Math.TAU) {
		Math.TAU = Math.PI * 2;
	}
	const TAU = Math.TAU;

	function rgb2hsv(r, g, b) {
		r /= 255;
		g /= 255;
		b /= 255;

		const min = Math.min(r, g, b);
		const max = Math.max(r, g, b);
		const delta = max - min;

		let h = 0;
		let s = 0;
		let v = max;

		if (delta !== 0) {
			s = delta / max;
			const dh = delta / 2;
			const dr = (((max - r) / 6) + dh) / delta;
			const dg = (((max - g) / 6) + dh) / delta;
			const db = (((max - b) / 6) + dh) / delta;

			if (r === max) { h = db - dg; }
			else if (g === max) { h = (1 / 3) + dr - db; }
			else if (b === max) { h = (2 / 3) + dg - dr; }

			if (h < 0) { h += 1; }
			if (h > 1) { h -= 1; }

//			h = h * 360;
//			s = s * 100;
		}

//		v = v * 100;

		return {h, s, v};
	}

	function hsv2rgb(h, s, v) {
		let r, g, b;

//		h /= 360;
//		s /= 100;
//		v /= 100;

		if (s === 0) {
			r = v * 255;
			g = v * 255;
			b = v * 255;
		} else {
			const h6 = h * 6;
			const h6i = h6|0;
			const x = v * (1 - s);
			const y = v * (1 - s * (h6 - h6i));
			const z = v * (1 - s * (1 - (h6 - h6i)));

			switch (h6i) {
			case 0:  r = v; g = z; b = x; break;
			case 1:  r = y; g = v; b = x; break;
			case 2:  r = x; g = v; b = z; break;
			case 3:  r = x; g = y; b = v; break;
			case 4:  r = z; g = x; b = v; break;
			default: r = v; g = x; b = y;
			}

			r *= 255;
			g *= 255;
			b *= 255;

			r = Math.round(r);
			g = Math.round(g);
			b = Math.round(b);
		}

		return {r, g, b};
	}

	function vlinesEffect(image, args, ctx) {
		const width = args.width;
		const useColor = args.useColor;
		if (!useColor) {
			ctx.fillStyle = 'black';
		}
		for (let y = 0; y < image.height; ++ y) {
			const yoff = y * image.width * 4;
			for (let xoff = 0; xoff < image.width; xoff += width) {
				const xend = Math.min(xoff + width, image.width);
				if (xoff < xend) {
					let r = 0, g = 0, b = 0;
					for (let x = xoff; x < xend; ++ x) {
						const index = yoff + x * 4;
						let a = image.data[index + 3];
						const ia = 255 - a;
						a /= 255;
						r += ia + image.data[index] * a;
						g += ia + image.data[index + 1] * a;
						b += ia + image.data[index + 2] * a;
					}
					const w = xend - xoff;
					const val = (r + g + b) / (3 * 255);
					if (useColor) {
						// XXX: maybe I want hsl?
						const { h, s, v } = rgb2hsv(r / w, g / w, b / w);
						const x = val / w;
						//           s   v
						// x == 1 -> s   v
						// x == 0 -> 1  0.5
						const rgb = hsv2rgb(h, s * x + (1 - x), v);
						ctx.fillStyle = 'rgb('+rgb.r+','+rgb.g+','+rgb.b+')';
					}
					const len = w - val;
					const xstart = xoff + (w - len) / 2;
					ctx.fillRect(xstart, y, len, 1);
				}
			}
		}
	}

	function hlinesEffect(image, args, ctx) {
		const width = args.width;
		const useColor = args.useColor;
		if (!useColor) {
			ctx.fillStyle = 'black';
		}
		for (let ybase = 0; ybase < image.height; ybase += width) {
			for (let x = 0; x < image.width; ++ x) {
				const yend = Math.min(ybase + width, image.height);
				if (ybase < yend) {
					let r = 0, g = 0, b = 0;
					for (let y = ybase; y < yend; ++ y) {
						const index = y * image.width * 4 + x * 4;
						let a = image.data[index + 3];
						const ia = 255 - a;
						a /= 255;
						r += ia + image.data[index] * a;
						g += ia + image.data[index + 1] * a;
						b += ia + image.data[index + 2] * a;
					}
					const w = yend - ybase;
					const val = (r + g + b) / (3 * 255);
					if (useColor) {
						const { h, s, v } = rgb2hsv(r / w, g / w, b / w);
						const x = val / w;
						const rgb = hsv2rgb(h, s * x + (1 - x), v);
						ctx.fillStyle = 'rgb('+rgb.r+','+rgb.g+','+rgb.b+')';
					}
					const len = w - val;
					const ystart = ybase + (w - len) / 2;
					ctx.fillRect(x, ystart, 1, len);
				}
			}
		}
	}

	function exprEffect(image, args, ctx) {
		const expr = new Function('x', 'y', 'w', 'h', 'lw', 'return (' + args.expr + ');');
		const imwidth = image.width;
		const imheight = image.height;
		const imwidth4 = imwidth * 4;
		const width = Math.max(Math.round(args.width * imheight), 1);
		const ybaseStart = 'ystart' in args ? imheight * args.ystart : 0;
		const ybaseEnd = 'yend' in args ? imheight * args.yend : imheight;
		const useColor = args.useColor;
		if (!useColor) {
			ctx.fillStyle = 'black';
		}
		for (let ybase = ybaseStart; ybase < ybaseEnd; ybase += width) {
			for (let x = 0; x < imwidth; ++ x) {
				const yres = expr(x, ybase, imwidth, imheight, width);
				const ystart = Math.max(yres, 0);
				const yend = Math.min(yres + width, imheight);
				if (ystart < yend) {
					const pixcount = Math.ceil(yend - ystart);
					let r = 0, g = 0, b = 0;
					const xoff = x * 4;
					for (let y = ystart; y < yend; ++ y) {
						const index = (y|0) * imwidth4 + xoff;
						let a = image.data[index + 3];
						const ia = 255 - a;
						a /= 255;
						r += ia + image.data[index] * a;
						g += ia + image.data[index + 1] * a;
						b += ia + image.data[index + 2] * a;
					}

					let val = (r + g + b) / (3 * 255);
					val += (width - pixcount) * val / pixcount;
					if (useColor) {
						const { h, s, v } = rgb2hsv(r / pixcount, g / pixcount, b / pixcount);
						const x = val / pixcount;
						const rgb = hsv2rgb(h, s * x + (1 - x), v);
						ctx.fillStyle = 'rgb('+rgb.r+','+rgb.g+','+rgb.b+')';
					}
					const len = width - val;
					ctx.fillRect(x, yres + (width - len) / 2, 1, len);
				}
			}
		}
	}

	function dotsEffect(image, args, ctx) {
		const size = args.size;
		const colorMode = args.colorMode;
		const bw    = colorMode === 'bw';
		const mixed = colorMode === 'mixed';
		const cmyk  = colorMode === 'cmyk';
		const halfSize = size / 2;
		const quarterSize = size / 4;
		const threeQuarterSize = size * 3 / 4;
		const rBase = args.overlap ?
			Math.sqrt(halfSize*halfSize + halfSize*halfSize) : 
			halfSize;
		const seed = args.seed;
		const imwidth = image.width;
		const imheight = image.height;
		if (bw) {
			ctx.fillStyle = 'black';
		} else if (cmyk) {
			ctx.globalCompositeOperation = "multiply";
		}
		for (let ybase = 0; ybase < imheight; ybase += size) {
			const yend = Math.min(ybase + size, imheight);
			for (let xbase = 0; xbase < imwidth; xbase += size) {
				const xend = Math.min(xbase + size, imwidth);
				let r = 0, g = 0, b = 0;
				for (let y = ybase; y < yend; ++ y) {
					const offset = y * imwidth * 4;
					for (let x = xbase; x < xend; ++ x) {
						const index = offset + x * 4;
						let a = image.data[index + 3];
						const ia = 255 - a;
						a /= 255;
						r += ia + image.data[index] * a;
						g += ia + image.data[index + 1] * a;
						b += ia + image.data[index + 2] * a;
					}
				}
				const ysize = yend - ybase;
				const xsize = xend - xbase;
				const pixcount = ysize * xsize;
				if (cmyk) {
					const divisor = pixcount * 255;
					r = r / divisor;
					g = g / divisor;
					b = b / divisor;

					const k = 1 - Math.max(r, g, b);
					const ik = 1 - k;
					const c = (1 - r - k) / ik;
					const m = (1 - g - k) / ik;
					const y = (1 - b - k) / ik;

					const rc = c * rBase;
					const rm = m * rBase;
					const ry = y * rBase;
					const rk = k * rBase;

					ctx.fillStyle = 'cyan';
					ctx.beginPath();
					ctx.ellipse(xbase + quarterSize, ybase + quarterSize, rc, rc, 0, 0, TAU);
					ctx.fill();

					ctx.fillStyle = 'magenta';
					ctx.beginPath();
					ctx.ellipse(xbase + threeQuarterSize, ybase + quarterSize, rm, rm, 0, 0, TAU);
					ctx.fill();

					ctx.fillStyle = 'yellow';
					ctx.beginPath();
					ctx.ellipse(xbase + threeQuarterSize, ybase + quarterSize, ry, ry, 0, 0, TAU);
					ctx.fill();

					ctx.fillStyle = 'black';
					ctx.beginPath();
					ctx.ellipse(xbase + threeQuarterSize, ybase + threeQuarterSize, rk, rk, 0, 0, TAU);
					ctx.fill();
				} else {
					const val = (r + g + b) / (3 * 255);
					const norm = 1 - val / pixcount;
					const radius = norm * rBase;
					if (mixed) {
						const { h, s, v } = rgb2hsv(r / pixcount, g / pixcount, b / pixcount);
						const x = val / pixcount;
						const rgb = hsv2rgb(h, s * x + (1 - x), v);
						ctx.fillStyle = 'rgb('+rgb.r+','+rgb.g+','+rgb.b+')';
					}
					ctx.beginPath();
					ctx.ellipse(xbase + halfSize, ybase + halfSize, radius, radius, 0, 0, TAU);
					ctx.fill();
				}
			}
		}
	}

	let image = new Image();
	const EFFECTS = [
		{
			name: "Vertical Lines",
			func: vlinesEffect,
			inputs: [
				{ label: 'Line-Width', id: 'width', min: 1, step: 1, value: 5 },
				{ label: 'Color', id: 'useColor', type: 'checkbox', checked: false },
			]
		},
		{
			name: "Horizontal Lines",
			func: hlinesEffect,
			inputs: [
				{ label: 'Line-Width', id: 'width', min: 1, step: 1, value: 5 },
				{ label: 'Color', id: 'useColor', type: 'checkbox', checked: false },
			]
		},
		{
			name: "Expression",
			func: exprEffect,
			inputs: [
				//{ label: 'Function', id: 'expr', type: 'text', value: 'y + Math.sin(5 * Math.PI * x / w) * lw - x * 0.25' },
				{ label: 'Function', id: 'expr', type: 'text', value: 'y + Math.sin(2 * Math.TAU * (x/w)) * w * 0.1 - (x/w) * h' },
				{ label: 'Line-Width', id: 'width', min: 0, step: 0.0001, value: 0.015 },
				{ label: 'Y-Start', id: 'ystart', type: 'number', step: 0.0001, value: 0, optional: true, disabled: false },
				{ label: 'Y-End', id: 'yend', type: 'number', step: 0.0001, value: 2, optional: true, disabled: false },
				{ label: 'Color', id: 'useColor', type: 'checkbox', checked: false },
			]
		},
		{
			name: "Dots",
			func: dotsEffect,
			inputs: [
				{ label: 'Size', id: 'size', min: 1, step: 1, value: 5 },
				{ label: 'Overlap', id: 'overlap', type: 'checkbox', checked: true },
				{ label: 'Color Mode', id: 'colorMode', type: 'select', value: 'bw', options: [
					{ value: 'bw', label: 'Black and White' },
					{ value: 'mixed', label: 'Colored Dots' },
					{ value: 'cmyk', label: 'CMYK' },
				] },
			]
		},
	];

	const EFFECT_MAP = {};

	for (let i = 0; i < EFFECTS.length; ++ i) {
		const effect = EFFECTS[i];
		effect.id = "effect_" + i;
		EFFECT_MAP[effect.id] = effect;
	}

	function redraw() {
		if (image.src) {
			console.log(new Date(), "redraw");
			const effectId = document.getElementById("effect").value;
			const effect = EFFECT_MAP[effectId];
			const offscreenEl = document.createElement("canvas");
			const canvasEl = document.getElementById('canvas');
			const scale = +document.getElementById("scale").value;
			const blur = +document.getElementById("blur").value;
			let cw = image.naturalWidth;
			let ch = image.naturalHeight;

			if (scale !== 1) {
				cw = Math.floor(cw * scale);
				ch = Math.floor(ch * scale);
			}
			
			offscreenEl.width = cw;
			offscreenEl.height = ch;

			let ctx = offscreenEl.getContext("2d");

			ctx.globalCompositeOperation = 'source-over';
			if (blur > 0) {
				ctx.filter = 'blur(' + blur + 'px)';
			}

			ctx.drawImage(image, 0, 0, cw, ch);
			const imageData = ctx.getImageData(0, 0, cw, ch);
			const args = {};
			for (const input of effect.inputs) {
				if (!input.optional || document.getElementById('option_effect_input_' + input.id).checked) {
					const inputEl = document.getElementById('effect_input_' + input.id);
					args[input.id] = (
						inputEl.type === 'number'   || inputEl.type === 'range' ? +inputEl.value :
						inputEl.type === 'checkbox' || inputEl.type === 'radio' ? inputEl.checked :
						inputEl.value);
				}
			}

			canvasEl.width = cw;
			canvasEl.height = ch;

			ctx = canvasEl.getContext("2d");
			ctx.fillStyle = 'white';
			ctx.fillRect(0, 0, cw, ch);
			ctx.fillStyle = 'black';
			effect.func(imageData, args, ctx);
		}
	}

	image.onload = redraw;

	function updateFile(event) {
		if (event.target.files.length > 0) {
			image.src = URL.createObjectURL(event.target.files[0]);
		}
	}

	function buildOptions(parentEl, options) {
		for (const option of options) {
			const tp = typeof option;
			if (tp === 'object' && tp.type === 'group') {
				const optgroupEl = document.createElement('optgroup');
				optgroupEl.label = option.label;
				buildOptions(optgroupEl, option.options);
				parentEl.appendChild(optgroupEl);
			} else {
				const optionEl = document.createElement('option');
				if (tp === 'string') {
					optionEl.value = option;
					optionEl.appendChild(document.createTextNode(option));
				} else {
					optionEl.value = option.value;
					optionEl.appendChild(document.createTextNode(option.label));
				}
				parentEl.appendChild(optionEl);
			}
		}
	}

	function updateSelection() {
		const effectEl = document.getElementById('effect');
		const effect = EFFECT_MAP[effectEl.value];
		const inputsEl = document.getElementById('inputs');
		inputsEl.innerHTML = '';
		for (const input of effect.inputs) {
			const labelEl = document.createElement('label');
			const liEl = document.createElement('li');
			const disabled = !!input.disabled;
			let resetEl;
			let inputEl;
			const checkable = input.type === 'checkbox' || input.type === 'radio';

			if (input.type === 'select') {
				inputEl = document.createElement('select');
				buildOptions(inputEl, input.options);
			}
			else if (input.type === 'textarea') {
				inputEl = document.createElement('textarea');
				if ('value' in input) {
					inputEl.value = input.value;
				}
			} else {
				inputEl = document.createElement('input');
				inputEl.type = input.type ? input.type :
					'min' in input && 'max' in input ? 'range' :
					'min' in input || 'max' in input ? 'number' : 'text';
				for (const attr of ['value', 'min', 'max', 'step', 'checked']) {
					if (attr in input) {
						inputEl[attr] = input[attr];
					}
				}
			}

			inputEl.disabled = disabled;
			inputEl.id = 'effect_input_' + input.id;
			if (input.name) {
				inputEl.name = 'effect_input_' + input.name;
			}

			liEl.className = 'input';
			if (!checkable) {
				labelEl.appendChild(document.createTextNode(input.label + ': '));

				resetEl = document.createElement('button');
				resetEl.id = 'reset_effect_input_' + input.id;
				resetEl.disabled = disabled;
				resetEl.addEventListener('click', function (inputEl, input) {
					inputEl.value = input.value;
					redraw();
				}.bind(null, inputEl, input), false);
				resetEl.appendChild(document.createTextNode('Reset'));
			}

			inputEl.addEventListener('change', redraw, false);

			labelEl.appendChild(inputEl);
			if (checkable) {
				labelEl.appendChild(document.createTextNode(' ' + input.label));
			}

			if (input.optional) {
				const optionalEl = document.createElement('input');
				optionalEl.id = 'option_effect_input_' + input.id;
				optionalEl.type = 'checkbox';
				optionalEl.checked = !disabled;
				optionalEl.addEventListener('change', function (inputEl, resetEl, event) {
					const enabled = this.checked;
					inputEl.disabled = !enabled;
					if (resetEl) {
						resetEl.disabled = !enabled;
					}
					redraw();
				}.bind(optionalEl, inputEl, resetEl), false);
				liEl.appendChild(optionalEl);
				liEl.appendChild(document.createTextNode(' '));
			}


			liEl.appendChild(labelEl);
			if (resetEl) {
				liEl.appendChild(resetEl);
			}
			inputsEl.appendChild(liEl);
			inputsEl.appendChild(document.createTextNode(' '));
		}
		redraw();
	}

	function increaseValue(input) {
		input.value = +input.value + +input.step;
		redraw();
	}

	function decreaseValue(input) {
		input.value = +input.value - +input.step;
		redraw();
	}

	function resetValue(input) {
		if (input.type === 'checkbox' || input.type === 'radio') {
			input.checked = input.getAttribute("checked");
		} else {
			input.value = input.getAttribute("value");
		}
		redraw();
	}

	window.addEventListener('load', () => {
		const effectEl = document.getElementById('effect');
		for (const effect of EFFECTS) {
			const optionEl = document.createElement('option');
			optionEl.value = effect.id;
			optionEl.appendChild(document.createTextNode(effect.name));
			effectEl.appendChild(optionEl);
		}
		updateSelection();
		effectEl.addEventListener('change', updateSelection, false);
		const fileEl = document.getElementById('file');
		fileEl.addEventListener('change', updateFile, false);

		const scaleEl = document.getElementById("scale");
		const blurEl = document.getElementById("blur");
		const scaleOutEl = document.getElementById("scale-out");
		const blurOutEl = document.getElementById("blur-out");

		function setScaleOut() {
			scaleOutEl.innerHTML = '';
			scaleOutEl.appendChild(document.createTextNode(scaleEl.value + ' x'));
		}

		function setBlurOut() {
			blurOutEl.innerHTML = '';
			blurOutEl.appendChild(document.createTextNode(blurEl.value + ' px'));
		}

		scaleEl.addEventListener("change", redraw, false);
		scaleEl.addEventListener("input", setScaleOut, false);

		blurEl.addEventListener("change", redraw, false);
		blurEl.addEventListener("input", setBlurOut, false);

		document.getElementById("blur-decr").addEventListener("click", () => {
			decreaseValue(blurEl);
			setBlurOut();
		}, false);

		document.getElementById("blur-incr").addEventListener("click", () => {
			increaseValue(blurEl);
			setBlurOut();
		}, false);

		document.getElementById("blur-reset").addEventListener("click", () => {
			resetValue(blurEl);
			setBlurOut();
		}, false);

		document.getElementById("scale-decr").addEventListener("click", () => {
			decreaseValue(scaleEl);
			setScaleOut();
		}, false);

		document.getElementById("scale-incr").addEventListener("click", () => {
			increaseValue(scaleEl);
			setScaleOut();
		}, false);

		document.getElementById("scale-reset").addEventListener("click", () => {
			resetValue(scaleEl);
			setScaleOut();
		}, false);

		setScaleOut();
		setBlurOut();
	}, false);
})();