/**
 * @param context
 * @param x
 * @param y
 * @param width
 * @param height
 * @param options
 */
export function drawRoundedRect (context, x, y, width, height, options = {}) {
  const {
    tl = 0, tr = 0,
    bl = 0, br = 0
  } = options;

  context.beginPath();
  
  context.moveTo(x + tl, y);

  context.lineTo(x + width - tr, y);
  context.quadraticCurveTo(x + width, y, x + width, y + tr);

  context.lineTo(x + width, y + height - br);
  context.quadraticCurveTo(x + width, y + height, x + width - br, y + height);

  context.lineTo(x + bl, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - bl);

  context.lineTo(x, y + tl);
  context.quadraticCurveTo(x, y, x + tl, y);

  context.closePath();
}
