package com.danceshorts.studio;

import android.Manifest;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.content.ContentUris;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.MediaStore;
import android.util.Size;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.util.ArrayList;

/**
 * Permissions (gallery, camera, mic) + phone ki saari photo/video ki list + thumbnails.
 */
@CapacitorPlugin(name = "DsMedia")
public class DsMediaPlugin extends Plugin {

    private static final String VISUAL_SELECTED = "android.permission.READ_MEDIA_VISUAL_USER_SELECTED";
    private long lastReq = 0;

    private boolean has(String p) {
        return ContextCompat.checkSelfPermission(getContext(), p) == PackageManager.PERMISSION_GRANTED;
    }

    private boolean fullMedia() {
        if (Build.VERSION.SDK_INT >= 33) {
            return has(Manifest.permission.READ_MEDIA_IMAGES) && has(Manifest.permission.READ_MEDIA_VIDEO);
        }
        return has(Manifest.permission.READ_EXTERNAL_STORAGE);
    }

    private boolean anyMedia() {
        if (fullMedia()) return true;
        return Build.VERSION.SDK_INT >= 34 && has(VISUAL_SELECTED);
    }

    private void need(ArrayList<String> l, String p) {
        if (!has(p)) l.add(p);
    }

    @PluginMethod
    public void hasPermissions(PluginCall call) {
        JSObject r = new JSObject();
        r.put("media", anyMedia());
        r.put("partial", anyMedia() && !fullMedia());
        r.put("camera", has(Manifest.permission.CAMERA));
        r.put("mic", has(Manifest.permission.RECORD_AUDIO));
        call.resolve(r);
    }

    /** Gallery + camera + mic ek saath maangta hai. */
    @PluginMethod
    public void requestPermissions(final PluginCall call) {
        final ArrayList<String> l = new ArrayList<>();
        need(l, Manifest.permission.CAMERA);
        need(l, Manifest.permission.RECORD_AUDIO);
        if (Build.VERSION.SDK_INT >= 33) {
            need(l, Manifest.permission.READ_MEDIA_IMAGES);
            need(l, Manifest.permission.READ_MEDIA_VIDEO);
            if (Build.VERSION.SDK_INT >= 34 && !fullMedia()) l.add(VISUAL_SELECTED);
        } else {
            need(l, Manifest.permission.READ_EXTERNAL_STORAGE);
            if (Build.VERSION.SDK_INT <= 29) need(l, Manifest.permission.WRITE_EXTERNAL_STORAGE);
        }
        long now = System.currentTimeMillis();
        if (!l.isEmpty() && now - lastReq > 4000) {
            lastReq = now;
            getActivity().runOnUiThread(() ->
                ActivityCompat.requestPermissions(getActivity(), l.toArray(new String[0]), 9911));
        }
        call.resolve();
    }

    @PluginMethod
    public void list(PluginCall call) {
        int offset = call.getInt("offset", 0);
        int limit = call.getInt("limit", 90);
        Uri uri = MediaStore.Files.getContentUri("external");
        String[] proj = {
            MediaStore.Files.FileColumns._ID,
            MediaStore.Files.FileColumns.DATA,
            MediaStore.Files.FileColumns.MEDIA_TYPE,
            MediaStore.Files.FileColumns.DATE_ADDED
        };
        String sel = MediaStore.Files.FileColumns.MEDIA_TYPE + "=" + MediaStore.Files.FileColumns.MEDIA_TYPE_IMAGE
            + " OR " + MediaStore.Files.FileColumns.MEDIA_TYPE + "=" + MediaStore.Files.FileColumns.MEDIA_TYPE_VIDEO;
        try (Cursor c = getContext().getContentResolver().query(
                uri, proj, sel, null, MediaStore.Files.FileColumns.DATE_ADDED + " DESC")) {
            JSArray items = new JSArray();
            int total = c == null ? 0 : c.getCount();
            if (c != null && c.moveToPosition(offset)) {
                int n = 0;
                do {
                    String path = c.getString(1);
                    if (path != null) {
                        JSObject o = new JSObject();
                        o.put("id", c.getLong(0));
                        o.put("path", path);
                        o.put("type", c.getInt(2) == MediaStore.Files.FileColumns.MEDIA_TYPE_VIDEO ? "video" : "image");
                        o.put("date", c.getLong(3));
                        items.put(o);
                    }
                    n++;
                } while (n < limit && c.moveToNext());
            }
            JSObject r = new JSObject();
            r.put("items", items);
            r.put("total", total);
            call.resolve(r);
        } catch (Exception e) {
            call.reject(String.valueOf(e.getMessage()));
        }
    }

    @SuppressWarnings("deprecation")
    @PluginMethod
    public void thumb(PluginCall call) {
        try {
            long id = call.getData().optLong("id");
            String type = call.getString("type", "image");
            boolean video = "video".equals(type);
            File dir = new File(getContext().getCacheDir(), "dsthumbs");
            dir.mkdirs();
            File f = new File(dir, type + "_" + id + ".jpg");
            if (!f.exists()) {
                Bitmap bm;
                if (Build.VERSION.SDK_INT >= 29) {
                    Uri u = ContentUris.withAppendedId(
                        video ? MediaStore.Video.Media.EXTERNAL_CONTENT_URI : MediaStore.Images.Media.EXTERNAL_CONTENT_URI, id);
                    bm = getContext().getContentResolver().loadThumbnail(u, new Size(256, 256), null);
                } else if (video) {
                    bm = MediaStore.Video.Thumbnails.getThumbnail(
                        getContext().getContentResolver(), id, MediaStore.Video.Thumbnails.MINI_KIND, null);
                } else {
                    bm = MediaStore.Images.Thumbnails.getThumbnail(
                        getContext().getContentResolver(), id, MediaStore.Images.Thumbnails.MINI_KIND, null);
                }
                if (bm == null) { call.reject("no thumb"); return; }
                try (FileOutputStream o = new FileOutputStream(f)) {
                    bm.compress(Bitmap.CompressFormat.JPEG, 80, o);
                }
            }
            JSObject r = new JSObject();
            r.put("path", f.getAbsolutePath());
            call.resolve(r);
        } catch (Exception e) {
            call.reject(String.valueOf(e.getMessage()));
        }
    }
}
