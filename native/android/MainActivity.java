package id.animeku.app;

import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

// Disalin ke project Android pas build (lihat .github/workflows/android.yml).
public class MainActivity extends BridgeActivity {

    @Override
    public void onStart() {
        super.onStart();
        // Bawaan Capacitor: semua pindah halaman ke domain lain dilempar ke browser,
        // termasuk yang terjadi di dalam iframe player (redirect server video).
        // Di sini cuma halaman utama yang dilempar, iframe dibiarin jalan di app.
        bridge.setWebViewClient(new BridgeWebViewClient(bridge) {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (!request.isForMainFrame()) return false;
                return super.shouldOverrideUrlLoading(view, request);
            }
        });
    }
}
