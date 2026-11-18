package com.danceshorts.studio;

import android.annotation.SuppressLint;
import android.content.pm.ActivityInfo;
import android.graphics.Color;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * "YouTube" tab: asli WebView jo app ke upar (tab bar ke upar tak) aata hai.
 * youtube.com normal browser ki tarah khulta hai, iframe nahi.
 */
@CapacitorPlugin(name = "YtView")
public class YtViewPlugin extends Plugin {

    private WebView yt;
    private View customView;
    private WebChromeClient.CustomViewCallback customCb;

    @SuppressLint("SetJavaScriptEnabled")
    private void create(ViewGroup parent, String url) {
        yt = new WebView(getActivity());
        yt.setBackgroundColor(Color.WHITE);

        WebSettings s = yt.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);

        CookieManager cm = CookieManager.getInstance();
        cm.setAcceptCookie(true);
        cm.setAcceptThirdPartyCookies(yt, true);

        yt.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                String u = r.getUrl().toString();
                // http/https sab isi view me khulenge; intent:// jaise links block
                return !(u.startsWith("http://") || u.startsWith("https://"));
            }
        });

        yt.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onShowCustomView(View view, CustomViewCallback cb) {
                if (customView != null) { cb.onCustomViewHidden(); return; }
                customView = view;
                customCb = cb;
                view.setBackgroundColor(Color.BLACK);
                FrameLayout decor = (FrameLayout) getActivity().getWindow().getDecorView();
                decor.addView(view, new FrameLayout.LayoutParams(-1, -1));
                decor.setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                    | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
                getActivity().setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);
            }

            @Override
            public void onHideCustomView() {
                exitFullscreen();
            }
        });

        ViewGroup.MarginLayoutParams lp = new ViewGroup.MarginLayoutParams(-1, -1);
        parent.addView(yt, lp);
        yt.loadUrl(url);
    }

    private void exitFullscreen() {
        if (customView == null) return;
        FrameLayout decor = (FrameLayout) getActivity().getWindow().getDecorView();
        decor.removeView(customView);
        decor.setSystemUiVisibility(View.SYSTEM_UI_FLAG_VISIBLE);
        customView = null;
        if (customCb != null) customCb.onCustomViewHidden();
        customCb = null;
        getActivity().setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
    }

    @PluginMethod
    public void show(final PluginCall call) {
        final int bottom = call.getInt("bottom", 0);
        final String url = call.getString("url", "https://m.youtube.com/");
        getActivity().runOnUiThread(() -> {
            try {
                ViewGroup parent = (ViewGroup) getBridge().getWebView().getParent();
                if (yt == null) create(parent, url);
                ViewGroup.MarginLayoutParams lp = (ViewGroup.MarginLayoutParams) yt.getLayoutParams();
                lp.bottomMargin = bottom;
                yt.setLayoutParams(lp);
                yt.setVisibility(View.VISIBLE);
                yt.onResume();
                yt.bringToFront();
                call.resolve();
            } catch (Exception e) {
                call.reject(String.valueOf(e.getMessage()));
            }
        });
    }

    @PluginMethod
    public void hide(final PluginCall call) {
        getActivity().runOnUiThread(() -> {
            exitFullscreen();
            if (yt != null) {
                yt.setVisibility(View.GONE);
                yt.onPause();
            }
            call.resolve();
        });
    }

    /** Back: pehle fullscreen band, phir YouTube history me peeche. handled=false => app ko handle karne do. */
    @PluginMethod
    public void goBack(final PluginCall call) {
        getActivity().runOnUiThread(() -> {
            boolean handled = false;
            if (customView != null) {
                exitFullscreen();
                handled = true;
            } else if (yt != null && yt.getVisibility() == View.VISIBLE && yt.canGoBack()) {
                yt.goBack();
                handled = true;
            }
            JSObject r = new JSObject();
            r.put("handled", handled);
            call.resolve(r);
        });
    }

    @Override
    protected void handleOnDestroy() {
        if (yt != null) yt.destroy();
        super.handleOnDestroy();
    }
}
