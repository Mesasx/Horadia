import AppKit

// Horadia app icon — 1024×1024, full-bleed, no transparency (§47).
// An "H" of three rounded calendar blocks, pastel blue→lavender→pink, on a soft
// frosted-light ground.

let size = 1024.0
let rect = CGRect(x: 0, y: 0, width: size, height: size)
let space = CGColorSpace(name: CGColorSpace.sRGB)!

guard let ctx = CGContext(
    data: nil, width: Int(size), height: Int(size),
    bitsPerComponent: 8, bytesPerRow: 0, space: space,
    bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue
) else { fatalError("ctx") }

func c(_ r: Double, _ g: Double, _ b: Double, _ a: Double = 1) -> CGColor {
    CGColor(srgbRed: r/255, green: g/255, blue: b/255, alpha: a)
}
func roundedRect(_ r: CGRect, _ radius: Double) -> CGPath {
    let safe = min(radius, min(r.width, r.height) / 2)
    return CGPath(roundedRect: r, cornerWidth: safe, cornerHeight: safe, transform: nil)
}
func grad(_ colors: [CGColor], _ locs: [CGFloat]) -> CGGradient {
    CGGradient(colorsSpace: space, colors: colors as CFArray, locations: locs)!
}

// Background: soft diagonal wash.
ctx.drawLinearGradient(
    grad([c(236, 239, 251), c(245, 238, 245)], [0, 1]),
    start: CGPoint(x: 0, y: size), end: CGPoint(x: size, y: 0), options: [])
ctx.drawRadialGradient(
    grad([c(255, 255, 255, 0.55), c(255, 255, 255, 0)], [0, 1]),
    startCenter: CGPoint(x: size * 0.42, y: size * 0.62), startRadius: 0,
    endCenter: CGPoint(x: size * 0.5, y: size * 0.5), endRadius: size * 0.78, options: [])

// --- "H" geometry
let markLeft = 266.0, markRight = 758.0
let barW = 138.0, barCorner = 52.0
let barTop = 250.0, barBottom = 774.0
let leftBarX = markLeft
let rightBarX = markRight - barW

let crossX = leftBarX + barW - 26
let crossRight = rightBarX + 26
let crossW = crossRight - crossX
let crossH = 168.0
let crossY = (barTop + barBottom) / 2 - crossH / 2
let crossCorner = 78.0

let mark = CGMutablePath()
mark.addPath(roundedRect(CGRect(x: leftBarX, y: barTop, width: barW, height: barBottom - barTop), barCorner))
mark.addPath(roundedRect(CGRect(x: rightBarX, y: barTop, width: barW, height: barBottom - barTop), barCorner))
mark.addPath(roundedRect(CGRect(x: crossX, y: crossY, width: crossW, height: crossH), crossCorner))

// Shadow under the mark.
ctx.saveGState()
ctx.setShadow(offset: CGSize(width: 0, height: -10), blur: 36, color: c(88, 98, 168, 0.30))
ctx.addPath(mark)
ctx.setFillColor(c(255, 255, 255, 0.92))
ctx.fillPath()
ctx.restoreGState()

// Gradient fill clipped to the mark.
ctx.saveGState()
ctx.addPath(mark)
ctx.clip()
ctx.drawLinearGradient(
    grad([c(122, 170, 240), c(159, 146, 232), c(240, 178, 214)], [0.0, 0.5, 1.0]),
    start: CGPoint(x: markLeft, y: barBottom),
    end: CGPoint(x: markRight, y: barTop),
    options: [.drawsBeforeStartLocation, .drawsAfterEndLocation])
ctx.drawLinearGradient(
    grad([c(255, 255, 255, 0.38), c(255, 255, 255, 0)], [0, 1]),
    start: CGPoint(x: 0, y: size), end: CGPoint(x: 0, y: size * 0.42), options: [])
ctx.restoreGState()

// Lighter frosted cross-bar, as in the reference.
ctx.saveGState()
ctx.addPath(roundedRect(CGRect(x: crossX, y: crossY, width: crossW, height: crossH), crossCorner))
ctx.clip()
ctx.setFillColor(c(255, 255, 255, 0.32))
ctx.fill(rect)
ctx.restoreGState()

guard let image = ctx.makeImage() else { fatalError("image") }
let png = NSBitmapImageRep(cgImage: image).representation(using: .png, properties: [:])!
let out = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "icon-1024.png"
try! png.write(to: URL(fileURLWithPath: out))
print("wrote \(out)")
