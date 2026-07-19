package com.grzegorzjasionowicz.strengthsave

import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.WeightRecord
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

// Lokalny plugin Capacitora (Z117): zapis sesji treningowych do Health Connect
// + odczyt najnowszej masy ciala. JS: registerPlugin('HealthSync') — src/lib/health-bridge.ts.
@CapacitorPlugin(name = "HealthSync")
class HealthSyncPlugin : Plugin() {

    private val scope = CoroutineScope(Dispatchers.Main)

    private val activityTypes = mapOf(
        "strength" to ExerciseSessionRecord.EXERCISE_TYPE_STRENGTH_TRAINING,
        "running" to ExerciseSessionRecord.EXERCISE_TYPE_RUNNING,
        "cycling" to ExerciseSessionRecord.EXERCISE_TYPE_BIKING,
        "walking" to ExerciseSessionRecord.EXERCISE_TYPE_WALKING,
        "hiking" to ExerciseSessionRecord.EXERCISE_TYPE_HIKING,
        "swimming" to ExerciseSessionRecord.EXERCISE_TYPE_SWIMMING_POOL,
        "jumpRope" to ExerciseSessionRecord.EXERCISE_TYPE_OTHER_WORKOUT,
        "hiit" to ExerciseSessionRecord.EXERCISE_TYPE_HIGH_INTENSITY_INTERVAL_TRAINING,
        "other" to ExerciseSessionRecord.EXERCISE_TYPE_OTHER_WORKOUT,
    )

    private fun client(): HealthConnectClient? =
        if (HealthConnectClient.getSdkStatus(context) == HealthConnectClient.SDK_AVAILABLE)
            HealthConnectClient.getOrCreate(context)
        else null

    @PluginMethod
    fun isAvailable(call: PluginCall) {
        val ret = JSObject()
        ret.put("available", HealthConnectClient.getSdkStatus(context) == HealthConnectClient.SDK_AVAILABLE)
        call.resolve(ret)
    }

    @PluginMethod
    fun requestHealthPermissions(call: PluginCall) {
        val hc = client()
        if (hc == null) {
            val ret = JSObject()
            ret.put("granted", false)
            call.resolve(ret)
            return
        }
        scope.launch {
            try {
                val needed = setOf(
                    HealthPermission.getWritePermission(ExerciseSessionRecord::class),
                    HealthPermission.getReadPermission(WeightRecord::class),
                )
                val granted = hc.permissionController.getGrantedPermissions()
                val ret = JSObject()
                if (granted.containsAll(needed)) {
                    ret.put("granted", true)
                    call.resolve(ret)
                } else {
                    // Pelny flow zgod wymaga ActivityResult — v1: otwieramy ustawienia Health Connect,
                    // user nadaje zgody tam; kolejne wywolanie zwroci granted=true.
                    val intent = android.content.Intent(HealthConnectClient.ACTION_HEALTH_CONNECT_SETTINGS)
                    try { activity.startActivity(intent) } catch (_: Exception) { /* brak apki HC */ }
                    ret.put("granted", false)
                    call.resolve(ret)
                }
            } catch (e: Exception) {
                call.reject("permissions failed: ${e.message}")
            }
        }
    }

    @PluginMethod
    fun writeWorkout(call: PluginCall) {
        val hc = client()
        if (hc == null) {
            call.reject("unavailable")
            return
        }
        val typeName = call.getString("activityType") ?: run { call.reject("invalid payload"); return }
        val startMs = call.getDouble("startMs") ?: run { call.reject("invalid payload"); return }
        val endMs = call.getDouble("endMs") ?: run { call.reject("invalid payload"); return }
        if (endMs <= startMs) { call.reject("invalid payload"); return }
        val exerciseType = activityTypes[typeName] ?: ExerciseSessionRecord.EXERCISE_TYPE_OTHER_WORKOUT

        scope.launch {
            try {
                val record = ExerciseSessionRecord(
                    startTime = Instant.ofEpochMilli(startMs.toLong()),
                    startZoneOffset = null,
                    endTime = Instant.ofEpochMilli(endMs.toLong()),
                    endZoneOffset = null,
                    exerciseType = exerciseType,
                    title = "Strength Save",
                )
                hc.insertRecords(listOf(record))
                val ret = JSObject()
                ret.put("ok", true)
                call.resolve(ret)
            } catch (e: Exception) {
                call.reject("insert failed: ${e.message}")
            }
        }
    }

    @PluginMethod
    fun readLatestWeight(call: PluginCall) {
        val hc = client()
        if (hc == null) {
            val ret = JSObject()
            ret.put("sample", JSObject.NULL)
            call.resolve(ret)
            return
        }
        scope.launch {
            try {
                val response = hc.readRecords(
                    ReadRecordsRequest(
                        recordType = WeightRecord::class,
                        timeRangeFilter = TimeRangeFilter.before(Instant.now()),
                        ascendingOrder = false,
                        pageSize = 1,
                    )
                )
                val ret = JSObject()
                val record = response.records.firstOrNull()
                if (record == null) {
                    ret.put("sample", JSObject.NULL)
                } else {
                    val sample = JSObject()
                    sample.put("kg", record.weight.inKilograms)
                    sample.put(
                        "date",
                        DateTimeFormatter.ofPattern("yyyy-MM-dd")
                            .withZone(ZoneId.systemDefault())
                            .format(record.time)
                    )
                    ret.put("sample", sample)
                }
                call.resolve(ret)
            } catch (e: Exception) {
                call.reject("read failed: ${e.message}")
            }
        }
    }
}
