import SwiftUI
import WebKit
#if os(macOS)
import AppKit

struct GolfView: NSViewRepresentable {
    func makeNSView(context: Context) -> MacGolfView { MacGolfView() }
    func updateNSView(_ view: MacGolfView, context: Context) {}
}

final class MacGolfView: NSView, WKNavigationDelegate {
    private let gameURL = URL(string: "https://pinecrest-golf.dylan-clark-6614.chatgpt.site/")!
    private let webView: WKWebView
    private let spinner = NSProgressIndicator()
    private let errorPanel = NSStackView()

    init() {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        webView = WKWebView(frame: .zero, configuration: configuration)
        super.init(frame: .zero)
        wantsLayer = true
        layer?.backgroundColor = NSColor(calibratedRed: 0.09, green: 0.18, blue: 0.15, alpha: 1).cgColor
        webView.navigationDelegate = self
        webView.translatesAutoresizingMaskIntoConstraints = false
        addSubview(webView)
        NSLayoutConstraint.activate([
            webView.leadingAnchor.constraint(equalTo: leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: trailingAnchor),
            webView.topAnchor.constraint(equalTo: topAnchor),
            webView.bottomAnchor.constraint(equalTo: bottomAnchor)
        ])
        spinner.style = .spinning
        spinner.isDisplayedWhenStopped = false
        spinner.translatesAutoresizingMaskIntoConstraints = false
        addSubview(spinner)
        NSLayoutConstraint.activate([
            spinner.centerXAnchor.constraint(equalTo: centerXAnchor),
            spinner.centerYAnchor.constraint(equalTo: centerYAnchor)
        ])
        errorPanel.orientation = .vertical
        errorPanel.alignment = .centerX
        errorPanel.spacing = 18
        errorPanel.translatesAutoresizingMaskIntoConstraints = false
        let label = NSTextField(wrappingLabelWithString: "Unable to load Pinecrest Golf. Check your internet connection and retry.")
        label.alignment = .center
        label.textColor = .white
        label.font = .systemFont(ofSize: 16)
        errorPanel.addArrangedSubview(label)
        errorPanel.addArrangedSubview(NSButton(title: "Retry", target: self, action: #selector(loadGame)))
        addSubview(errorPanel)
        NSLayoutConstraint.activate([
            errorPanel.centerXAnchor.constraint(equalTo: centerXAnchor),
            errorPanel.centerYAnchor.constraint(equalTo: centerYAnchor),
            errorPanel.widthAnchor.constraint(lessThanOrEqualToConstant: 420),
            errorPanel.widthAnchor.constraint(lessThanOrEqualTo: widthAnchor, constant: -48)
        ])
        loadGame()
    }

    required init?(coder: NSCoder) { fatalError("Use init()") }

    override func viewDidMoveToWindow() {
        super.viewDidMoveToWindow()
        window?.title = "Pinecrest Golf"
        window?.contentMinSize = NSSize(width: 900, height: 700)
    }

    @objc private func loadGame() {
        errorPanel.isHidden = true
        webView.isHidden = false
        spinner.startAnimation(nil)
        webView.load(URLRequest(url: gameURL))
    }

    private func showError() {
        spinner.stopAnimation(nil)
        webView.isHidden = true
        errorPanel.isHidden = false
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        spinner.stopAnimation(nil)
        window?.makeFirstResponder(webView)
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        if (error as NSError).code != NSURLErrorCancelled { showError() }
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        if (error as NSError).code != NSURLErrorCancelled { showError() }
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) { showError() }

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url else { decisionHandler(.cancel); return }
        if url.scheme == "https" && url.host == gameURL.host {
            if navigationAction.targetFrame == nil { webView.load(URLRequest(url: url)); decisionHandler(.cancel) }
            else { decisionHandler(.allow) }
        } else {
            decisionHandler(.cancel)
            if navigationAction.navigationType == .linkActivated && ["https", "mailto"].contains(url.scheme ?? "") {
                NSWorkspace.shared.open(url)
            }
        }
    }
}
#else
import UIKit

struct GolfView: UIViewControllerRepresentable {
    func makeUIViewController(context: Context) -> GolfController { GolfController() }
    func updateUIViewController(_ controller: GolfController, context: Context) {}
}

final class GolfController: UIViewController, WKNavigationDelegate {
    private let gameURL = URL(string: "https://pinecrest-golf.dylan-clark-6614.chatgpt.site/")!
    private var webView: WKWebView!
    private let spinner = UIActivityIndicatorView(style: .large)
    private let errorPanel = UIStackView()

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.09, green: 0.18, blue: 0.15, alpha: 1)
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = self
        webView.isOpaque = false
        webView.backgroundColor = view.backgroundColor
        webView.scrollView.backgroundColor = view.backgroundColor
        webView.scrollView.bounces = false
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(webView)
        NSLayoutConstraint.activate([
            webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            webView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            webView.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor)
        ])
        spinner.color = .white
        spinner.hidesWhenStopped = true
        spinner.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(spinner)
        NSLayoutConstraint.activate([
            spinner.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            spinner.centerYAnchor.constraint(equalTo: view.centerYAnchor)
        ])
        errorPanel.axis = .vertical
        errorPanel.spacing = 18
        errorPanel.alignment = .center
        errorPanel.translatesAutoresizingMaskIntoConstraints = false
        let label = UILabel()
        label.text = "Unable to load Pinecrest Golf.\nCheck your internet connection and retry."
        label.numberOfLines = 0
        label.textAlignment = .center
        label.textColor = .white
        label.font = .preferredFont(forTextStyle: .body)
        label.adjustsFontForContentSizeCategory = true
        let retry = UIButton(type: .system)
        retry.setTitle("Retry", for: .normal)
        retry.titleLabel?.font = .preferredFont(forTextStyle: .headline)
        retry.addTarget(self, action: #selector(loadGame), for: .touchUpInside)
        errorPanel.addArrangedSubview(label)
        errorPanel.addArrangedSubview(retry)
        view.addSubview(errorPanel)
        NSLayoutConstraint.activate([
            errorPanel.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            errorPanel.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            errorPanel.widthAnchor.constraint(lessThanOrEqualTo: view.widthAnchor, constant: -48),
            retry.heightAnchor.constraint(greaterThanOrEqualToConstant: 44)
        ])
        loadGame()
    }

    @objc private func loadGame() {
        errorPanel.isHidden = true
        webView.isHidden = false
        spinner.startAnimating()
        webView.load(URLRequest(url: gameURL))
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        #if targetEnvironment(macCatalyst)
        view.window?.windowScene?.sizeRestrictions?.minimumSize = CGSize(width: 900, height: 700)
        view.window?.windowScene?.title = "Pinecrest Golf"
        #endif
    }

    private func showError() {
        spinner.stopAnimating()
        webView.isHidden = true
        errorPanel.isHidden = false
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        spinner.stopAnimating()
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        if (error as NSError).code != NSURLErrorCancelled { showError() }
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        if (error as NSError).code != NSURLErrorCancelled { showError() }
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) { showError() }

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url else { decisionHandler(.cancel); return }
        if url.scheme == "https" && url.host == gameURL.host {
            if navigationAction.targetFrame == nil { webView.load(URLRequest(url: url)); decisionHandler(.cancel) }
            else { decisionHandler(.allow) }
        } else {
            decisionHandler(.cancel)
            if navigationAction.navigationType == .linkActivated && ["https", "mailto"].contains(url.scheme ?? "") {
                UIApplication.shared.open(url)
            }
        }
    }
}

#endif
