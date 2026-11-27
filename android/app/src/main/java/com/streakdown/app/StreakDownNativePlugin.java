package com.streakdown.app;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.JSObject;
import org.json.JSONArray;

@CapacitorPlugin(name = "StreakDownNative")
public class StreakDownNativePlugin extends Plugin {
    @Override public void load() {
        handleOnNewIntent(getActivity().getIntent());
    }

    @Override protected void handleOnNewIntent(android.content.Intent intent) {
        if (intent == null || !WidgetViews.ACTION_CHECK_IN.equals(intent.getAction())) return;
        String goalId = intent.getStringExtra("goal_id");
        if (goalId == null) return;
        intent.removeExtra("goal_id");
        JSObject data = new JSObject();
        data.put("goalId", goalId);
        notifyListeners("openJournal", data, true);
    }

    @PluginMethod
    public void syncGoals(PluginCall call) {
        JSONArray goals = call.getArray("goals");
        if (goals == null) goals = new JSONArray();
        WidgetStore.saveGoals(getContext(), goals);
        LargeWidgetProvider.refreshAll(getContext());
        JSObject result = new JSObject();
        result.put("success", true);
        call.resolve(result);
    }

    @PluginMethod
    public void getGoals(PluginCall call) {
        JSObject result = new JSObject();
        result.put("goals", WidgetStore.getGoals(getContext()));
        call.resolve(result);
    }
}
