import SwiftUI

/// Horadia's pastel palette (product brief section 3: "colores pastel", and
/// section 21: subjects get unique auto-assigned pastel colours).
///
/// Colours are defined programmatically with explicit light *and* dark variants
/// so the app looks right in both appearances without hand-editing an asset
/// catalog. Each token exposes:
/// - `fill`: the soft block background,
/// - `border`: a slightly stronger hairline for accessibility (section 45),
/// - `accent`: a saturated version for text / icons / the "now" line.
enum PastelColor: String, CaseIterable, Codable, Identifiable, Sendable {
    case blush, peach, apricot, butter, citron, sage
    case mint, seafoam, sky, periwinkle, lavender, lilac
    case mauve, rose, clay, stone

    var id: String { rawValue }

    /// Human-facing name (Ajustes → asignaturas colour picker, section 38).
    var displayName: String {
        switch self {
        case .blush: return "Rubor"
        case .peach: return "Melocotón"
        case .apricot: return "Albaricoque"
        case .butter: return "Mantequilla"
        case .citron: return "Cidra"
        case .sage: return "Salvia"
        case .mint: return "Menta"
        case .seafoam: return "Espuma"
        case .sky: return "Cielo"
        case .periwinkle: return "Vincapervinca"
        case .lavender: return "Lavanda"
        case .lilac: return "Lila"
        case .mauve: return "Malva"
        case .rose: return "Rosa"
        case .clay: return "Arcilla"
        case .stone: return "Piedra"
        }
    }

    // MARK: Semantic roles

    var fill: Color { Color(dynamic: swatch.fillLight, dark: swatch.fillDark) }
    var border: Color { Color(dynamic: swatch.borderLight, dark: swatch.borderDark) }
    var accent: Color { Color(dynamic: swatch.accentLight, dark: swatch.accentDark) }

    // MARK: Raw values

    private struct Swatch {
        var fillLight: (Double, Double, Double)
        var fillDark: (Double, Double, Double)
        var borderLight: (Double, Double, Double)
        var borderDark: (Double, Double, Double)
        var accentLight: (Double, Double, Double)
        var accentDark: (Double, Double, Double)
    }

    private var swatch: Swatch {
        switch self {
        case .blush:      return Swatch(fillLight: (1.00, 0.90, 0.92), fillDark: (0.28, 0.17, 0.21), borderLight: (0.96, 0.74, 0.79), borderDark: (0.55, 0.33, 0.40), accentLight: (0.80, 0.34, 0.45), accentDark: (0.96, 0.68, 0.75))
        case .peach:      return Swatch(fillLight: (1.00, 0.91, 0.84), fillDark: (0.30, 0.20, 0.14), borderLight: (0.98, 0.78, 0.64), borderDark: (0.58, 0.38, 0.26), accentLight: (0.82, 0.45, 0.24), accentDark: (0.97, 0.73, 0.55))
        case .apricot:    return Swatch(fillLight: (1.00, 0.89, 0.79), fillDark: (0.31, 0.22, 0.13), borderLight: (0.98, 0.76, 0.57), borderDark: (0.60, 0.42, 0.24), accentLight: (0.80, 0.50, 0.18), accentDark: (0.96, 0.75, 0.48))
        case .butter:     return Swatch(fillLight: (1.00, 0.96, 0.82), fillDark: (0.29, 0.26, 0.14), borderLight: (0.95, 0.86, 0.58), borderDark: (0.56, 0.50, 0.26), accentLight: (0.66, 0.54, 0.14), accentDark: (0.92, 0.84, 0.48))
        case .citron:     return Swatch(fillLight: (0.94, 0.97, 0.80), fillDark: (0.23, 0.28, 0.14), borderLight: (0.83, 0.91, 0.56), borderDark: (0.44, 0.53, 0.25), accentLight: (0.48, 0.56, 0.14), accentDark: (0.80, 0.88, 0.46))
        case .sage:       return Swatch(fillLight: (0.88, 0.94, 0.86), fillDark: (0.17, 0.26, 0.19), borderLight: (0.72, 0.86, 0.70), borderDark: (0.36, 0.50, 0.36), accentLight: (0.28, 0.52, 0.30), accentDark: (0.66, 0.84, 0.66))
        case .mint:       return Swatch(fillLight: (0.84, 0.95, 0.90), fillDark: (0.13, 0.28, 0.24), borderLight: (0.64, 0.88, 0.80), borderDark: (0.30, 0.53, 0.46), accentLight: (0.16, 0.53, 0.44), accentDark: (0.56, 0.86, 0.78))
        case .seafoam:    return Swatch(fillLight: (0.83, 0.94, 0.94), fillDark: (0.13, 0.27, 0.28), borderLight: (0.62, 0.86, 0.87), borderDark: (0.29, 0.51, 0.53), accentLight: (0.15, 0.50, 0.53), accentDark: (0.54, 0.83, 0.86))
        case .sky:        return Swatch(fillLight: (0.84, 0.92, 0.99), fillDark: (0.13, 0.23, 0.32), borderLight: (0.63, 0.81, 0.96), borderDark: (0.30, 0.45, 0.60), accentLight: (0.18, 0.45, 0.72), accentDark: (0.56, 0.78, 0.97))
        case .periwinkle: return Swatch(fillLight: (0.87, 0.89, 0.99), fillDark: (0.18, 0.20, 0.34), borderLight: (0.70, 0.74, 0.97), borderDark: (0.37, 0.40, 0.63), accentLight: (0.33, 0.38, 0.75), accentDark: (0.66, 0.70, 0.98))
        case .lavender:   return Swatch(fillLight: (0.91, 0.87, 0.98), fillDark: (0.22, 0.18, 0.33), borderLight: (0.78, 0.70, 0.95), borderDark: (0.44, 0.37, 0.62), accentLight: (0.45, 0.34, 0.72), accentDark: (0.74, 0.66, 0.97))
        case .lilac:      return Swatch(fillLight: (0.95, 0.87, 0.97), fillDark: (0.27, 0.18, 0.31), borderLight: (0.87, 0.70, 0.92), borderDark: (0.51, 0.36, 0.57), accentLight: (0.55, 0.31, 0.63), accentDark: (0.83, 0.64, 0.90))
        case .mauve:      return Swatch(fillLight: (0.96, 0.88, 0.92), fillDark: (0.28, 0.19, 0.25), borderLight: (0.88, 0.72, 0.80), borderDark: (0.52, 0.37, 0.45), accentLight: (0.58, 0.34, 0.46), accentDark: (0.85, 0.66, 0.75))
        case .rose:       return Swatch(fillLight: (1.00, 0.88, 0.89), fillDark: (0.30, 0.17, 0.19), borderLight: (0.98, 0.72, 0.74), borderDark: (0.58, 0.34, 0.37), accentLight: (0.78, 0.32, 0.38), accentDark: (0.96, 0.66, 0.70))
        case .clay:       return Swatch(fillLight: (0.96, 0.90, 0.85), fillDark: (0.28, 0.22, 0.18), borderLight: (0.88, 0.76, 0.66), borderDark: (0.52, 0.42, 0.33), accentLight: (0.56, 0.42, 0.30), accentDark: (0.84, 0.72, 0.60))
        case .stone:      return Swatch(fillLight: (0.92, 0.92, 0.93), fillDark: (0.22, 0.23, 0.25), borderLight: (0.78, 0.79, 0.81), borderDark: (0.42, 0.44, 0.47), accentLight: (0.40, 0.42, 0.45), accentDark: (0.74, 0.76, 0.79))
        }
    }
}

extension Color {
    /// Builds an appearance-aware colour from two RGB triples (0…1).
    init(dynamic light: (Double, Double, Double), dark: (Double, Double, Double)) {
        self.init(uiColor: UIColor { traits in
            let c = traits.userInterfaceStyle == .dark ? dark : light
            return UIColor(red: c.0, green: c.1, blue: c.2, alpha: 1)
        })
    }
}
