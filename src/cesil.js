/**
 * @package CESIL
 * @subpackage JavaScript Interpreter
 * @author Yorick Phoenix <yphoenix@scribblings.com>
 * @copyright Copyright (c) 2024, FNIX Enterprises
 *
 * @see https://en.wikipedia.org/wiki/CESIL
 */

/*! Copyright (c) 2024, FNIX Enterprises */

import { argv } from 'node:process';
import fs       from 'node:fs';
import readline from 'node:readline';

const version = '1.0.7';

function Debug()
{
	if (Debug.debug)
	{
		console.log(...arguments);
	}
}

Debug.debug = false;

export default class Cesil
{
	static parsingData = false;
	static parseLabel = '';

	/**
	 * Check the command line arguments
	 */

	static CLI()
	{
		if (argv.length < 3)
		{
			console.log('cesil --version')
			console.log('cesil <file>.ces')
			console.log('cesil --debug <file>.ces')
		}
		else
		{
			switch (argv[2])
			{
				case '--version':
					console.log('cesil v' + version);
					break

				case '--debug':
					Debug.debug = true;
					console.log(Debug.debug);
					argv.shift();
					// Fall Through

				default:
					Cesil.Execute(argv[2]);
					break;
			}
		}
	}

	/**
	 * Read the CESIL Program file, parse it and run it
	 *
	 * @param {string} file
	 */

	static Execute(file)
	{
		const code = new Map();
		const data = [];

		code.set(Cesil.parseLabel, []);

		const input = readline.createInterface(
						{
								input: fs.createReadStream(file),
							crlfDelay: Number.Infinity,
						});

		input.on('error', () => console.log('*** FAILED TO READ THE FILE: "' + file + '" ***'));

		input.on('line', (line) => Cesil.ParseLine(line, code, data));

		input.on('close', () => Cesil.Run(code, data));
	}

	/**
	 * Parse a line from the file
	 *
	 * @param {string} line
	 * @param {object} code - parsed code, to be updated
	 * @param {array}  data - parsed data, to be updated
	 */

	static ParseLine(line, code, data)
	{
		const firstChar = line[0] ?? '';

		// Ignore blank & comment lines

		if (line.trim() === '' ||
			['*', '('].indexOf(firstChar) !== -1)
		{
			return;
		}

		const parts = line.split(/\s+/);

		const label = parts.shift();
		const inst  = parts.shift() ?? '';

		let arg = line.slice(label.length);
		arg = arg.slice(arg.indexOf(inst) + inst.length).trim();

		if (label !== '' &&
			label !== '%')
		{
			Cesil.parseLabel = label;

			if (code.get(label) !== undefined)
			{
    			throw new Error('*** DUPLICATE LABEL: "' + label + '" ***');
			}

			code.set(label, []);
		}

		if (label == '%' ||
			inst !== '')
		{
			if (label === '%' ||
				inst === '%')
			{
				Cesil.parsingData = true;
			}
			else
			if (Cesil.parsingData)
			{
				const vals = line.trim().split(' ');

				vals.forEach(
					(val) =>
					{
						if (val !== '')
						{
							const intVal = Number.parseInt(val, 10);

							if (Number.isInteger(intVal))
							{
								data.push(intVal);
							}
							else
							{
    							throw new Error('*** NON-NUMERIC INPUT VALUE ***');
							}
						}
					});
			}
			else
			{
				code.get(Cesil.parseLabel)
					.push([inst.toUpperCase(), arg]);
			}
		}
	}

	/**
	 * Execute Parsed Code
	 *
	 * @param {object} code
	 * @param {array}  data
	 */

	static Run(code, data)
	{
		let stop = false;

		const store = new Map();
		const stack = [];

		Debug(code);

		const blocks = [...code.keys()];

		Debug(blocks);

		let blockIdx = 0;

		let acc = 0;

		Debug(data);

		/**
		 * Find a label in the code, returns index into code
		 *
		 * @param {string} label
		 *
		 * @returns {number}
		 */

		function FindLable(label)
		{
			const blockIdx = blocks.indexOf(label);

			if (blockIdx === -1)
			{
				throw new Error('*** LABEL: "' + label + '" NOT FOUND ***');
			}

			return blockIdx;
		}

		/**
		 * Get a value from the argument (constant or variable)
		 *
		 * @param {string} arg
		 *
		 * @returns {number}
		 */

		function GetValue(arg)
		{
			let res;

			res = Number.parseInt(arg, 10);

			if (!Number.isInteger(res))
			{
				res = store.get(arg);

				if (res === undefined)
				{
					throw new Error('*** DATA STORE "' + arg + '" DOESN\'T EXIST ***');
				}
			}

			return res;
		}

		/**
		 * Store a value in a variable
		 *
		 * @param {string} name
		 * @param {number} val
		 */

		function SetValue(name, val)
		{
			store.set(name, val);
		}

		try
		{
			let idx = 0;

			do
			{
				const curBlock = blocks[blockIdx];

				if (curBlock === undefined)
				{
					throw new Error('*** RAN OUT OF CODE ***');
				}

				const codeBlock = code.get(curBlock);

				let jumping = false;

				while (idx < codeBlock.length)
				{
					let ret, divisor;

					const line = codeBlock[idx];

					const cmd = line[0];
					const arg = line[1];

					Debug(acc, store);
					Debug([curBlock, idx, cmd, arg]);

					switch (cmd)
					{
						case 'IN':	  // reads the next value from the data, and stores it in the accumulator.
							if (data.length > 0)
							{
								acc = data.shift();
							}
							else
							{
								throw new Error('*** PROGRAM REQUIRES MORE DATA ***');
							}
							break;

						case 'OUT':   // prints the current value of the accumulator. No carriage return is printed.[15]
							process.stdout.write(String(acc));
							break;

						case 'PRINT': // "text in quotes" – prints the given text. No carriage return is printed.[15]
							process.stdout.write(arg.slice(1).slice(0, -1));
							break;

						case 'LINE':
							console.log('');
							break;

						case 'LOAD':  // location or LOAD constant – copies the value of the given location or constant to the accumulator.[17]
							acc = GetValue(arg);
							break;

						case 'STORE': // location – copies the contents of the accumulator to the given location.[10]
							SetValue(arg, acc);
							break;

						case 'ADD':      // location or ADD constant – adds the value of the given location or constant to the accumulator.[18]
							acc += GetValue(arg);
							break;

						case 'SUBTRACT': // location or SUBTRACT constant – subtracts the value of the given location or constant from the accumulator.[19]
							acc -= GetValue(arg);
							break;

						case 'MULTIPLY': // location or MULTIPLY constant – multiplies the accumulator by the value of the given location or constant.[20]
							acc *= GetValue(arg);
							break;

						case 'DIVIDE':
							divisor = GetValue(arg);
							if (divisor === 0)
							{
								throw new Error('*** DIVISION BY ZERO ***');
							}
							acc = acc / divisor;
							acc = acc > 0 ? Math.floor(acc) : Math.ceil(acc);
							break;

						case 'JUMP':   // label – unconditionally transfers control to location labelled.
						case 'JINEG':  // label (Jump If NEGative) – transfers control to location labelled if the accumulator contains a negative value.[24]
						case 'JIZERO': // label (Jump If ZERO) – transfers control to location labelled if the accumulator contains zero.[9]
							if ((cmd === 'JINEG' &&
						 		acc >= 0) ||
								(cmd === 'JIZERO' &&
						 		acc !== 0))
							{
								break;
							}
							blockIdx = FindLable(arg);
							idx = 0;
							jumping = true;
							break;

						case 'JSR':		// Jump to Subroutine
							stack.push([blockIdx, idx]);
							blockIdx = FindLable(arg);
							idx = 0;
							jumping = true;
							break;

						case 'RET':		// Return from Subroutine
							ret = stack.pop();
							blockIdx = ret[0];
							idx = ret[1] + 1;
							jumping = true;
							break;

						case 'HALT':	// Stop Execution
							stop = true;
							break;

						default:
							throw new Error('*** UNKNOWN INSTRUCTION: "' + cmd + '" ***');
					}

					if (stop || jumping)
					{
						break;
					}

					idx++;
				}

				if (!jumping && !stop)
				{
					blockIdx++;
					idx = 0;
				}
			} while (!stop);
		}
		catch (e)
		{
			console.log(e);
		}

		console.log();
	}
}
