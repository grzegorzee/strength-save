package com.grzegorzjasionowicz.strengthsave;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Z117: lokalny plugin Health Connect — rejestracja przed inicjalizacją mostka.
        registerPlugin(HealthSyncPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
