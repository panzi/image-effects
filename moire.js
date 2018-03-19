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
		const { max, min, round } = Math;
		const width = max(1, args.width);
		const useColor = args.useColor;
		if (!useColor) {
			ctx.fillStyle = 'black';
		}
		for (let y = 0; y < image.height; ++ y) {
			const yoff = y * image.width * 4;
			for (let xoff = 0; xoff < image.width; xoff += width) {
				const xend = min(xoff + width, image.width);
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
						const x = val / w;
						const x255 = x * 255;
						const divisor = 1 - x;
						const r2 = round((r/w - x255) / divisor);
						const g2 = round((g/w - x255) / divisor);
						const b2 = round((b/w - x255) / divisor);
						ctx.fillStyle = `rgb(${r2 < 0 ? 0 : r2}, ${g2 < 0 ? 0 : g2}, ${b2 < 0 ? 0 : b2})`;
					}
					const len = w - val;
					const xstart = xoff + (w - len) / 2;
					ctx.fillRect(xstart, y, len, 1);
				}
			}
		}
	}

	function hlinesEffect(image, args, ctx) {
		const { max, min, round } = Math;
		const width = max(1, args.width);
		const useColor = args.useColor;
		if (!useColor) {
			ctx.fillStyle = 'black';
		}
		for (let ybase = 0; ybase < image.height; ybase += width) {
			for (let x = 0; x < image.width; ++ x) {
				const yend = min(ybase + width, image.height);
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
						const x = val / w;
						const x255 = x * 255;
						const divisor = 1 - x;
						const r2 = round((r/w - x255) / divisor);
						const g2 = round((g/w - x255) / divisor);
						const b2 = round((b/w - x255) / divisor);
						ctx.fillStyle = `rgb(${r2 < 0 ? 0 : r2}, ${g2 < 0 ? 0 : g2}, ${b2 < 0 ? 0 : b2})`;
					}
					const len = w - val;
					const ystart = ybase + (w - len) / 2;
					ctx.fillRect(x, ystart, 1, len);
				}
			}
		}
	}

	let MATH_KEYS = new Set(Object.getOwnPropertyNames(Math));
	MATH_KEYS.delete('toSource');
	MATH_KEYS = Array.from(MATH_KEYS);
	const FUNC_PREFIX = `const { ${MATH_KEYS.join(', ')} } = Math; return (x, y, w, h, lw) => (`;
	const FUNC_SUFFIX = ');';

	function exprEffect(image, args, ctx) {
		const { min, max, ceil, round } = Math;
		const expr = (new Function(FUNC_PREFIX + args.expr + FUNC_SUFFIX))();
		const imwidth = image.width;
		const imheight = image.height;
		const imwidth4 = imwidth * 4;
		const width = max(round(args.relwidth * imheight), 1);
		const ybaseStart = 'ystart' in args ? imheight * args.ystart : 0;
		const ybaseEnd = 'yend' in args ? imheight * args.yend : imheight;
		const useColor = args.useColor;
		if (!useColor) {
			ctx.fillStyle = 'black';
		}
		for (let ybase = ybaseStart; ybase < ybaseEnd; ybase += width) {
			for (let x = 0; x < imwidth; ++ x) {
				const yres = expr(x, ybase, imwidth, imheight, width);
				const ystart = max(yres, 0);
				const yend = min(yres + width, imheight);
				if (ystart < yend) {
					const pixcount = ceil(yend - ystart);
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
						const x = val / pixcount;
						const x255 = x * 255;
						const divisor = 1 - x;
						const r2 = round((r/pixcount - x255) / divisor);
						const g2 = round((g/pixcount - x255) / divisor);
						const b2 = round((b/pixcount - x255) / divisor);
						ctx.fillStyle = `rgb(${r2 < 0 ? 0 : r2}, ${g2 < 0 ? 0 : g2}, ${b2 < 0 ? 0 : b2})`;
					}
					const len = width - val;
					ctx.fillRect(x, yres + (width - len) / 2, 1, len);
				}
			}
		}
	}

	function dotsEffect(image, args, ctx) {
		const { min, max, round, pow } = Math;
		const size = max(args.size, 1);
		const colorMode = args.colorMode;
		const bw    = colorMode === 'bw';
		const mixed = colorMode === 'mixed';
		const cmyk  = colorMode === 'cmyk';
		const rgb  = colorMode === 'rgb';
		const halfSize = size / 2;
		const quarterSize = size / 4;
		const threeQuarterSize = size * 3 / 4;
		const thirdSize = size * 1/3;
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
		} else if (rgb) {
			ctx.fillStyle = 'black';
			ctx.fillRect(0, 0, imwidth, imheight);
			ctx.globalCompositeOperation = "lighter";
		}
		const shift = bw || mixed;
		const power = min(max(args.power, 0), 2);
		let offset1 = 0;
		let offset2 = -(halfSize|0);
		for (let ybase = 0; ybase < imheight; ybase += size) {
			const yend = min(ybase + size, imheight);
			const ysize = yend - ybase;
			for (let xbase = shift ? offset1 : 0; xbase < imwidth; xbase += size) {
				const xend = min(xbase + size, imwidth);
				const xstart = max(xbase, 0);
				let r = 0, g = 0, b = 0;
				for (let y = ybase; y < yend; ++ y) {
					const offset = y * imwidth * 4;
					for (let x = xstart; x < xend; ++ x) {
						const index = offset + x * 4;
						let a = image.data[index + 3];
						const ia = 255 - a;
						a /= 255;
						r += ia + image.data[index] * a;
						g += ia + image.data[index + 1] * a;
						b += ia + image.data[index + 2] * a;
					}
				}
				const xsize = xend - xstart;
				const pixcount = ysize * xsize;
				if (cmyk) {
					const divisor = pixcount * 255;
					r = r / divisor;
					g = g / divisor;
					b = b / divisor;

					const k = 1 - max(r, g, b);
					const ik = 1 - k;
					const c = (1 - r - k) / ik;
					const m = (1 - g - k) / ik;
					const y = (1 - b - k) / ik;

					const rc = pow(c, power) * rBase;
					const rm = pow(m, power) * rBase;
					const ry = pow(y, power) * rBase;
					const rk = pow(k, power) * rBase;

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
					ctx.ellipse(xbase, ybase + threeQuarterSize, ry, ry, 0, 0, TAU);
					ctx.fill();

					ctx.fillStyle = 'black';
					ctx.beginPath();
					ctx.ellipse(xbase + halfSize, ybase + threeQuarterSize, rk, rk, 0, 0, TAU);
					ctx.fill();
				} else if (rgb) {
					const column = xbase / size;
					const radius = pow(1/3, power) * rBase;
					r = round(r / pixcount);
					g = round(g / pixcount);
					b = round(b / pixcount);

					if (column & 1) {
						ctx.fillStyle = `rgb(${r}, 0, 0)`;
						ctx.beginPath();
						ctx.ellipse(xbase + halfSize, ybase + quarterSize, radius, radius, 0, 0, TAU);
						ctx.fill();

						ctx.fillStyle = `rgb(0, ${g}, 0)`;
						ctx.beginPath();
						ctx.ellipse(xbase + halfSize - thirdSize, ybase + threeQuarterSize, radius, radius, 0, 0, TAU);
						ctx.fill();

						ctx.fillStyle = `rgb(0, 0, ${b})`;
						ctx.beginPath();
						ctx.ellipse(xbase + halfSize + thirdSize, ybase + threeQuarterSize, radius, radius, 0, 0, TAU);
						ctx.fill();
					} else {
						ctx.fillStyle = `rgb(0, ${g}, 0)`;
						ctx.beginPath();
						ctx.ellipse(xbase + halfSize - thirdSize, ybase + quarterSize, radius, radius, 0, 0, TAU);
						ctx.fill();

						ctx.fillStyle = `rgb(0, 0, ${b})`;
						ctx.beginPath();
						ctx.ellipse(xbase + halfSize + thirdSize, ybase + quarterSize, radius, radius, 0, 0, TAU);
						ctx.fill();

						ctx.fillStyle = `rgb(${r}, 0, 0)`;
						ctx.beginPath();
						ctx.ellipse(xbase + halfSize, ybase + threeQuarterSize, radius, radius, 0, 0, TAU);
						ctx.fill();
					}
				} else {
					const val = (r + g + b) / (3 * 255);
					const norm = 1 - val / pixcount;
					const radius = pow(norm, power) * rBase;
					if (radius < 0) {
						console.log({ val, norm, radius, pixcount, xsize, ysize, xstart, xend, xbase, ybase, yend });
					}
					if (mixed) {
						// not sure about this
//						const A = Math.PI * radius*radius;
//						const divisor = A / pixcount;
//						const x = 1 - divisor;
//						const x255 = x * 255;

//						const r2 = round((r/pixcount - x255) / divisor);
//						const g2 = round((g/pixcount - x255) / divisor);
//						const b2 = round((b/pixcount - x255) / divisor);
//						ctx.fillStyle = `rgb(${r2 < 0 ? 0 : r2}, ${g2 < 0 ? 0 : g2}, ${b2 < 0 ? 0 : b2})`;
						const r2 = r/pixcount;
						const g2 = g/pixcount;
						const b2 = b/pixcount;
						ctx.fillStyle = `rgb(${r2}, ${g2}, ${b2})`;
					}
					ctx.beginPath();
					ctx.ellipse(xbase + halfSize, ybase + halfSize, radius, radius, 0, 0, TAU);
					ctx.fill();
				}
			}
			const tmp = offset2;
			offset2 = offset1;
			offset1 = tmp;
		}
	}

	let image = new Image();
	const EFFECTS = [
		{
			name: "Vertical Lines",
			func: vlinesEffect,
			inputs: [
				{ label: 'Line-Width (px)', id: 'width', min: 1, step: 1, value: 5 },
				{ label: 'Color', id: 'useColor', type: 'checkbox', checked: false },
			]
		},
		{
			name: "Horizontal Lines",
			func: hlinesEffect,
			inputs: [
				{ label: 'Line-Width (px)', id: 'width', min: 1, step: 1, value: 5 },
				{ label: 'Color', id: 'useColor', type: 'checkbox', checked: false },
			]
		},
		{
			name: "Expression",
			func: exprEffect,
			inputs: [
				{ label: 'Function', id: 'expr', type: 'text', value: 'y + sin(2 * TAU * (x/w)) * w * 0.1 - (x/w) * h' },
				{ label: 'Line-Width (ratio)', id: 'relwidth', min: 0, step: 0.0001, value: 0.015 },
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
					{ value: 'mixed', label: 'Colored' },
					{ value: 'rgb', label: 'TV (RGB)' },
					{ value: 'cmyk', label: 'Print (CMYK)' },
				] },
				{ label: 'Power', id: 'power', type: 'range', min: 0, max: 2, step: 0.05, value: 1 },
			]
		},
	];

	const EFFECT_MAP = {};

	for (let i = 0; i < EFFECTS.length; ++ i) {
		const effect = EFFECTS[i];
		effect.id = "effect_" + i;
		EFFECT_MAP[effect.id] = effect;
	}

	function getArgs(effect) {
		const args = {};
		for (const input of effect.inputs) {
			if (!input.optional || document.getElementById('option_effect_input_' + input.id).checked) {
				const inputEl = document.getElementById('effect_input_' + input.id);
				if (inputEl) {
					args[input.id] = (
						inputEl.type === 'number'   || inputEl.type === 'range' ? +inputEl.value :
						inputEl.type === 'checkbox' || inputEl.type === 'radio' ? inputEl.checked :
						inputEl.value);
				}
			}
		}
		return args;
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
				cw = (cw * scale)|0;
				ch = (ch * scale)|0;
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
			const args = getArgs(effect);

			canvasEl.width = cw;
			canvasEl.height = ch;

			ctx = canvasEl.getContext("2d");
			ctx.fillStyle = 'white';
			ctx.fillRect(0, 0, cw, ch);
			ctx.fillStyle = 'black';
			effect.func(imageData, args, ctx);

			document.getElementById("save-btn").disabled = false;
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

	let currentEffect = null;

	function updateSelection() {
		const effectEl = document.getElementById('effect');
		const effect = EFFECT_MAP[effectEl.value];
		const inputsEl = document.getElementById('inputs');
		const oldEffect = currentEffect;
		const args = oldEffect ? getArgs(oldEffect) : {};
		const oldInputs = {};
		if (oldEffect) {
			for (const oldInput of oldEffect.inputs) {
				oldInputs[oldInput.id] = oldInput;
			}
		}
		currentEffect = effect;
		inputsEl.innerHTML = '';
		for (const input of effect.inputs) {
			const labelEl = document.createElement('label');
			const liEl = document.createElement('li');
			let resetEl;
			let inputEl;
			const disabled = !!input.disabled;
			const checkable = input.type === 'checkbox' || input.type === 'radio';
			const type = input.type ? input.type :
				'min' in input && 'max' in input ? 'range' :
				'min' in input || 'max' in input ? 'number' : 'text';
			if (!input.type) {
				input.type = type;
			}

			if (type === 'select') {
				inputEl = document.createElement('select');
				buildOptions(inputEl, input.options);
			}
			else if (type === 'textarea') {
				inputEl = document.createElement('textarea');
			} else {
				inputEl = document.createElement('input');
				inputEl.type = type;
				for (const attr of ['min', 'max', 'step', 'checked']) {
					if (attr in input) {
						inputEl[attr] = input[attr];
					}
				}
			}

			const oldInput = oldInputs[input.id];
			if (oldInput && oldInput.type === type && input.id in args) {
				if (checkable) {
					inputEl.checked = args[input.id];
				} else {
					inputEl.value = args[input.id];
				}
			} else if ('value' in input) {
				inputEl.value = input.value;
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
			if (input.type === 'range') {
				const outEl = document.createElement('span');
				const decrEl = document.createElement('button');
				const incrEl = document.createElement('button');

				outEl.className = 'input-output';
				outEl.appendChild(document.createTextNode(input.value.toFixed(2)));

				decrEl.addEventListener('click', function (inputEl, outEl) {
					let value = +inputEl.value - +(inputEl.step||1);
					if (inputEl.min && value < +inputEl.min) {
						value = +inputEl.min;
					}
					inputEl.value = value;
					outEl.innerHTML = '';
					outEl.appendChild(document.createTextNode(value.toFixed(2)));
					redraw();
				}.bind(decrEl, inputEl, outEl), false);

				incrEl.addEventListener('click', function (inputEl, outEl) {
					let value = +inputEl.value + +(inputEl.step||1);
					if (inputEl.max && value > +inputEl.max) {
						value = +inputEl.max;
					}
					inputEl.value = value;
					outEl.innerHTML = '';
					outEl.appendChild(document.createTextNode(value.toFixed(2)));
					redraw();
				}.bind(incrEl, inputEl, outEl), false);

				inputEl.addEventListener('input', function (outEl) {
					outEl.innerHTML = '';
					outEl.appendChild(document.createTextNode(Number(this.value).toFixed(2)));
				}.bind(inputEl, outEl), false);

				if (resetEl) {
					resetEl.addEventListener('click', function (outEl) {
						outEl.innerHTML = '';
						outEl.appendChild(document.createTextNode(Number(this.value).toFixed(2)));
					}.bind(inputEl, outEl), false);
				}

				decrEl.appendChild(document.createTextNode('-'));
				incrEl.appendChild(document.createTextNode('+'));

				labelEl.appendChild(outEl);
				labelEl.appendChild(document.createTextNode(' '));
				labelEl.appendChild(decrEl);
				labelEl.appendChild(inputEl);
				labelEl.appendChild(incrEl);
			} else {
				labelEl.appendChild(inputEl);
			}

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

	function replaceExt(filename, ext) {
		return filename.replace(/\.[^\.]+$/, '') + ext;
	}

	function saveImage() {
		const canvasEl = document.getElementById('canvas');
		const fileEl = document.getElementById('file');
		let filename;

		if (fileEl.files && fileEl.files.length > 0) {
			filename = replaceExt(fileEl.files[0].name, '.png');
		} else if (fileEl.value) {
			filename = fileEl.value.split(/[\\\/]/);
			filename = replaceExt(filename[filename.length - 1], '.png');
		} else if (currentEffect) {
			filename = currentEffect.name + '.png';
		} else {
			filename = 'output.png';
		}

		canvasEl.toBlob(blob => {
			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = filename;
			link.style.visibility = 'hidden';
			link.style.position = 'fixed';
			link.style.left = '0px';
			link.style.top = '0px';
			document.body.appendChild(link);
			link.click();

			setTimeout(() => {
				URL.revokeObjectURL(url);
				document.body.removeChild(link);
			}, 1000);
		}, 'image/png');
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

		document.getElementById("save-btn").addEventListener("click", saveImage, false);

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