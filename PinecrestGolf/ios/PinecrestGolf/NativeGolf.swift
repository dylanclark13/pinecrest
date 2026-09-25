import SwiftUI
import WebKit
import GameController
#if os(macOS)
import AppKit
#else
import UIKit
#endif

struct NativeCourse: Decodable, Identifiable {
    let id: Int
    let name, difficulty: String
    let available: Bool
    let best: Int
    let medal: String
}
struct NativeClub: Decodable, Identifiable {
    let id, name: String
    let level, cost, carry, nextCarry, forgiveness, nextForgiveness, spin, nextSpin: Int
}
struct NativeStats: Decodable {
    let scoredHoles, trackedHoles, putts, fairwayAttempts, fairways, greenAttempts, greens: Int
}
struct NativeSummary: Decodable {
    let tokens: Int
    let name: String
    let courses: [NativeCourse]
    let clubs: [NativeClub]
    let stats: NativeStats
    let resume, sound: Bool
}

// Only files shipped in the app are exposed to the offline WebKit renderer.
final class GameScheme: NSObject, WKURLSchemeHandler {
    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        guard let requestURL = urlSchemeTask.request.url, requestURL.host == "game",
              let root = Bundle.main.resourceURL?.appendingPathComponent("Game", isDirectory: true) else {
            urlSchemeTask.didFailWithError(URLError(.fileDoesNotExist)); return
        }
        let name = requestURL.path == "/" ? "index.html" : String(requestURL.path.dropFirst())
        guard !name.contains("/"), !name.contains(".."), !name.isEmpty else {
            urlSchemeTask.didFailWithError(URLError(.noPermissionsToReadFile)); return
        }
        do {
            let data = try Data(contentsOf: root.appendingPathComponent(name))
            let ext = (name as NSString).pathExtension
            let mime = ["html":"text/html", "js":"text/javascript", "css":"text/css", "svg":"image/svg+xml"][ext] ?? "application/octet-stream"
            urlSchemeTask.didReceive(URLResponse(url: requestURL, mimeType: mime, expectedContentLength: data.count, textEncodingName: "utf-8"))
            urlSchemeTask.didReceive(data)
            urlSchemeTask.didFinish()
        } catch { urlSchemeTask.didFailWithError(error) }
    }
    func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {}
}

final class NativeGame: NSObject, ObservableObject, WKScriptMessageHandlerWithReply, WKScriptMessageHandler, WKNavigationDelegate {
    @Published var summary: NativeSummary?
    @Published var menu = true
    @Published var error: String?
    @Published var controllerName = "No controller connected"
    @Published var haptics = true
    @Published var online = false
    let webView: WKWebView
    private var observers: [NSObjectProtocol] = []
    private var direction = 0
    private var saveURL: URL {
        get throws {
            let root = try FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true).appendingPathComponent("PinecrestGolf", isDirectory: true)
            try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
            return root.appendingPathComponent("career.json")
        }
    }
    override init() {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()
        config.setURLSchemeHandler(GameScheme(), forURLScheme: "pinecrest")
        webView = WKWebView(frame: .zero, configuration: config)
        super.init()
        config.userContentController.addScriptMessageHandler(self, contentWorld: .page, name: "career")
        for name in ["status", "play", "haptic", "nativeError"] { config.userContentController.add(self, name: name) }
        webView.navigationDelegate = self
        #if !os(macOS)
        webView.isOpaque = false
        webView.scrollView.bounces = false
        #endif
        webView.load(URLRequest(url: URL(string: "pinecrest://game/index.html")!))
        observers.append(NotificationCenter.default.addObserver(forName: .GCControllerDidConnect, object: nil, queue: .main) { [weak self] _ in self?.connectControllers() })
        observers.append(NotificationCenter.default.addObserver(forName: .GCControllerDidDisconnect, object: nil, queue: .main) { [weak self] _ in self?.releaseController(); self?.connectControllers() })
        connectControllers()
    }
    func send(_ action: String, _ value: Any = NSNull()) {
        guard let data = try? JSONSerialization.data(withJSONObject: [action, value]), let args = String(data: data, encoding: .utf8) else { return }
        webView.evaluateJavaScript("window.pinecrestNative && window.pinecrestNative(...\(args)); void 0;") { [weak self] _, failure in
            if let failure = failure { self?.error = failure.localizedDescription }
        }
    }
    func openMenu() { releaseController(); send("pause"); menu = true; send("status") }
    func releaseController() {
        for code in ["ArrowLeft", "ArrowRight", "Space"] { send("controller", ["code":code,"down":false]) }
        direction = 0
    }
    private func connectControllers() {
        controllerName = GCController.controllers().first?.vendorName ?? "No controller connected"
        for controller in GCController.controllers() {
            controller.handlerQueue = .main
            guard let pad = controller.extendedGamepad else { continue }
            pad.buttonA.pressedChangedHandler = { [weak self] _, _, pressed in self?.control("Space", pressed) }
            pad.leftShoulder.pressedChangedHandler = { [weak self] _, _, pressed in self?.control("ArrowUp", pressed) }
            pad.rightShoulder.pressedChangedHandler = { [weak self] _, _, pressed in self?.control("ArrowDown", pressed) }
            pad.buttonX.pressedChangedHandler = { [weak self] _, _, pressed in self?.control("KeyG", pressed) }
            pad.buttonY.pressedChangedHandler = { [weak self] _, _, pressed in self?.control("KeyC", pressed) }
            pad.buttonMenu.pressedChangedHandler = { [weak self] _, _, pressed in if pressed { self?.openMenu() } }
            pad.leftThumbstick.valueChangedHandler = { [weak self] _, x, _ in self?.aim(x) }
            pad.dpad.valueChangedHandler = { [weak self] _, x, _ in self?.aim(x) }
        }
    }
    private func aim(_ x: Float) {
        let next = x < -0.2 ? -1 : x > 0.2 ? 1 : 0
        guard next != direction else { return }
        if direction != 0 { control(direction < 0 ? "ArrowLeft" : "ArrowRight", false) }
        direction = next
        if next != 0 { control(next < 0 ? "ArrowLeft" : "ArrowRight", true) }
    }
    private func control(_ code: String, _ down: Bool) {
        guard !menu && !online else { return }
        send("controller", ["code":code,"down":down])
    }
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage, replyHandler: @escaping (Any?, String?) -> Void) {
        guard message.frameInfo.isMainFrame, message.frameInfo.request.url?.scheme == "pinecrest", let body = message.body as? [String:Any] else { replyHandler(nil,"Untrusted request"); return }
        do {
            let url = try saveURL
            if body["operation"] as? String == "read" {
                if !FileManager.default.fileExists(atPath: url.path) { replyHandler("",nil); return }
                replyHandler(try String(contentsOf: url, encoding: .utf8),nil)
            } else if body["operation"] as? String == "write", let value = body["data"] as? String, let data = value.data(using: .utf8), data.count <= 20_000_000 {
                _ = try JSONSerialization.jsonObject(with: data)
                try data.write(to: url, options: .atomic)
                replyHandler(true,nil)
            } else { replyHandler(nil,"Invalid save request") }
        } catch { replyHandler(nil,"Device save failed. Your previous save was preserved. \(error.localizedDescription)") }
    }
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.frameInfo.isMainFrame, message.frameInfo.request.url?.scheme == "pinecrest" else { return }
        switch message.name {
        case "status":
            if let data = try? JSONSerialization.data(withJSONObject: message.body), let value = try? JSONDecoder().decode(NativeSummary.self, from: data) { summary = value }
        case "play": menu = false
        case "nativeError": error = message.body as? String ?? "The action could not finish."
        case "haptic":
            guard haptics else { return }
            #if !os(macOS) && !targetEnvironment(macCatalyst)
            if message.body as? String == "hole" { UINotificationFeedbackGenerator().notificationOccurred(.success) }
            else { UIImpactFeedbackGenerator(style: message.body as? String == "perfect" ? .heavy : .medium).impactOccurred() }
            #endif
        default: break
        }
    }
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) { send("status") }
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError failure: Error) { error = failure.localizedDescription }
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) { error = "The game renderer stopped. Reload to resume your saved round." }
    func reload() { summary = nil; webView.reload() }
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if navigationAction.request.url?.scheme == "pinecrest" { decisionHandler(.allow) } else { decisionHandler(.cancel) }
    }
}

#if os(macOS)
struct BundledGameView: NSViewRepresentable {
    let game: NativeGame
    func makeNSView(context: Context) -> WKWebView { game.webView }
    func updateNSView(_ view: WKWebView, context: Context) {}
}
#else
struct BundledGameView: UIViewRepresentable {
    let game: NativeGame
    func makeUIView(context: Context) -> WKWebView { game.webView }
    func updateUIView(_ view: WKWebView, context: Context) {}
}
#endif

struct NativeGolfView: View {
    @StateObject private var game = NativeGame()
    @Environment(\.scenePhase) private var scenePhase
    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Button { game.openMenu() } label: { Label("Clubhouse", systemImage: "flag.fill") }
                Spacer()
                Text("Device career").font(.caption)
            }.padding(.horizontal).padding(.vertical, 8).background(Color(red: 0.06, green: 0.15, blue: 0.12))
            BundledGameView(game: game)
        }
        .sheet(isPresented: $game.menu, onDismiss: { game.send("wake") }) { NativeClubhouse(game: game) }
        .sheet(isPresented: $game.online, onDismiss: { game.menu = true }) {
            VStack { HStack { Text("Online career · Internet required"); Spacer(); Button("Done") { game.online = false } }.padding(); GolfView() }
        }
        .alert("Pinecrest Golf", isPresented: Binding(get: { game.error != nil }, set: { if !$0 { game.error = nil } })) {
            Button("OK", role: .cancel) { game.error = nil }
        } message: { Text(game.error ?? "") }
        .onChange(of: scenePhase) { phase in
            if phase == .active { game.send("wake") } else { game.releaseController(); game.send("pause") }
        }
    }
}

struct NativeClubhouse: View {
    @ObservedObject var game: NativeGame
    @State private var tab = "Courses"
    @State private var roundMode = "full"
    @State private var pendingCourse: NativeCourse?
    private let tabs = ["Courses", "Equipment", "Stats", "Settings"]
    var body: some View {
        NavigationStack {
            VStack {
                Picker("Clubhouse section", selection: $tab) { ForEach(tabs, id: \.self) { Text($0).tag($0) } }.pickerStyle(.segmented).padding(.horizontal)
                if let s = game.summary {
                    Form {
                        if tab == "Courses" { courses(s) }
                        if tab == "Equipment" { equipment(s) }
                        if tab == "Stats" { stats(s) }
                        if tab == "Settings" { settings(s) }
                    }
                } else {
                    Spacer(); ProgressView("Loading device career…")
                    Button("Retry") { game.reload() }.padding(); Spacer()
                }
            }
            .navigationTitle("Pinecrest Golf")
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Return to game") { game.menu = false } } }
            .onAppear { game.send("status") }
            .alert("Pinecrest Golf", isPresented: Binding(get: { game.error != nil }, set: { if !$0 { game.error = nil } })) {
                Button("OK", role: .cancel) { game.error = nil }
            } message: { Text(game.error ?? "") }
            .confirmationDialog("Replace your unfinished round?", isPresented: Binding(get: { pendingCourse != nil }, set: { if !$0 { pendingCourse = nil } }), titleVisibility: .visible) {
                Button("Start new round") { if let course = pendingCourse { game.send("start", ["course":course.id,"mode":roundMode]); pendingCourse = nil } }
                Button("Cancel", role: .cancel) { pendingCourse = nil }
            } message: { Text("Completed hole scores stay in your device stats. Your unfinished round will end.") }
        }
        .frame(minWidth: 300, minHeight: 440)
    }
    @ViewBuilder private func courses(_ s: NativeSummary) -> some View {
        Section("\(s.name) · \(s.tokens) tokens") {
            Text("All eight courses and practice areas work without internet. This career saves on this device.")
            if s.resume { Button("Resume saved round") { game.send("resume") } }
            Picker("Round", selection: $roundMode) { Text("18 holes").tag("full"); Text("Front nine").tag("front"); Text("Back nine").tag("back") }
        }
        Section("Practice · No effect on records") {
            Button("Driving range") { game.send("range") }
            Button("Putting green") { game.send("putting") }
        }
        Section("Courses") {
            ForEach(s.courses) { c in
                Button {
                    if s.resume { pendingCourse = c } else { game.send("start", ["course":c.id,"mode":roundMode]) }
                } label: {
                    VStack(alignment: .leading, spacing: 5) {
                        Text(c.name).font(.headline)
                        Text(c.difficulty).font(.subheadline)
                        if c.best > 0 { Text("Best \(c.best) · \(c.medal)").font(.caption) }
                        if !c.available { Text("Score 90 or lower over 18 holes on the previous course.").font(.caption) }
                    }
                }.disabled(!c.available)
            }
        }
    }
    @ViewBuilder private func equipment(_ s: NativeSummary) -> some View {
        Section("\(s.tokens) tokens available") {
            ForEach(s.clubs) { c in
                VStack(alignment: .leading, spacing: 8) {
                    Text("\(c.name) · Level \(c.level)").font(.headline)
                    Text("Distance: \(c.carry) → \(c.nextCarry) yd")
                    Text("Forgiveness: +\(c.forgiveness)% → +\(c.nextForgiveness)%")
                    Text(c.id == "putter" ? "Putter has no spin adjustment" : "Spin: \(c.spin)% → \(c.nextSpin)%")
                    if c.cost > 0 { Button("Upgrade for \(c.cost) tokens") { game.send("upgrade", c.id) }.disabled(s.tokens < c.cost) }
                    else { Text("Maximum level") }
                }.padding(.vertical, 6)
            }
        }
    }
    private func percent(_ n: Int, _ d: Int) -> String { d == 0 ? "No data" : "\(Int((Double(n) / Double(d) * 100).rounded()))%" }
    @ViewBuilder private func stats(_ s: NativeSummary) -> some View {
        Section("Device career stats") {
            LabeledContent("Scored holes", value: String(s.stats.scoredHoles))
            LabeledContent("Fairways hit", value: percent(s.stats.fairways, s.stats.fairwayAttempts))
            LabeledContent("Greens in regulation", value: percent(s.stats.greens, s.stats.greenAttempts))
            LabeledContent("Putts per hole", value: s.stats.trackedHoles == 0 ? "No data" : String(format: "%.2f", Double(s.stats.putts) / Double(s.stats.trackedHoles)))
            Text("Practice and daily challenges are excluded. Older saves might not include shot statistics.").font(.caption)
        }
        Section("Best 18 hole rounds") { ForEach(s.courses) { c in LabeledContent(c.name, value: c.best == 0 ? "No round" : "\(c.best) · \(c.medal)") } }
    }
    @ViewBuilder private func settings(_ s: NativeSummary) -> some View {
        Section("Play") {
            Toggle("Swing feedback on supported iPhones", isOn: $game.haptics)
            Toggle("Game sound", isOn: Binding(get: { game.summary?.sound ?? true }, set: { game.send("sound", $0); game.send("status") }))
            Button("Customize golfer") { game.send("character") }
            Button("Tutorial") { game.send("tutorial") }
        }
        Section("Controller") {
            Text(game.controllerName)
            Text("Left stick or D pad: aim. Hold A for power, release, then press A for timing. Shoulder buttons: clubs. X: slope dots. Y: camera. Menu: clubhouse.")
        }
        Section("Online career") {
            Text("Your existing email account and web career remain online. Device progress and tokens do not transfer to the online career.")
            Button("Open existing online career") { game.menu = false; DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) { game.online = true } }
        }
        Section("Saving") { Text("Scores and tokens save after each hole. Ball position saves between shots. If the app closes during a shot, resume from the last saved position. Removing the app may remove device progress.") }
    }
}
