package com.grzegorzjasionowicz.strengthsave

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.widget.TextView
import android.text.method.LinkMovementMethod
import android.text.util.Linkify

/** The same public policy supplied to Play Console, also reachable outside the WebView. */
class HealthPermissionsRationaleActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val policy = "https://strengthsave.app/privacy"
        try {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(policy)))
            finish()
        } catch (_: android.content.ActivityNotFoundException) {
            // A device without a browser still exposes a selectable policy address and Back.
            setContentView(TextView(this).apply {
                text = "Strength Save\n\n$policy"
                textSize = 18f
                setPadding(32, 48, 32, 32)
                setTextIsSelectable(true)
                autoLinkMask = Linkify.WEB_URLS
                movementMethod = LinkMovementMethod.getInstance()
            })
        }
    }
}
