import SwiftUI

@main
struct PinecrestGolfApp: App {
    var body: some Scene {
        WindowGroup {
            GolfView()
                .background(Color(red: 0.09, green: 0.18, blue: 0.15))
                .preferredColorScheme(.dark)
        }
    }
}
