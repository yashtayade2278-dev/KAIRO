package com.streakdown.app;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;

final class WidgetStore {
    static final String PREFS = "streakdown_native_widgets";
    static final String GOALS = "goals_json";
    static final String MAP = "widget_goal_";
    private WidgetStore() {}
    static SharedPreferences prefs(Context c) { return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE); }
    static JSONArray getGoals(Context c) {
        try {
            JSONArray stored = new JSONArray(prefs(c).getString(GOALS, "[]"));
            JSONArray clean = new JSONArray();
            boolean changed = false;
            for (int i = 0; i < stored.length(); i++) {
                JSONObject goal = stored.optJSONObject(i);
                if (goal == null) { changed = true; continue; }
                String id = goal.optString("id", "");
                if ("goal-seed-1".equals(id) || "goal-seed-2".equals(id)) { changed = true; continue; }
                clean.put(goal);
            }
            if (changed) prefs(c).edit().putString(GOALS, clean.toString()).apply();
            return clean;
        } catch (JSONException e) { return new JSONArray(); }
    }
    static void saveGoals(Context c, JSONArray goals) {
        JSONArray clean = new JSONArray();
        if (goals != null) for (int i = 0; i < goals.length(); i++) {
            JSONObject goal = goals.optJSONObject(i);
            if (goal == null) continue;
            String id = goal.optString("id", "");
            if ("goal-seed-1".equals(id) || "goal-seed-2".equals(id)) continue;
            clean.put(goal);
        }
        prefs(c).edit().putString(GOALS, clean.toString()).apply();
    }
    static String today() { return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date()); }
    static String yesterday() {
        Calendar c = Calendar.getInstance(); c.add(Calendar.DAY_OF_YEAR, -1);
        return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(c.getTime());
    }
    static JSONObject findGoal(Context c, String id) {
        JSONArray goals = getGoals(c);
        for (int i=0; i<goals.length(); i++) {
            JSONObject g = goals.optJSONObject(i);
            if (g != null && id.equals(g.optString("id"))) return g;
        }
        return null;
    }
    static String goalIdForWidget(Context c, int widgetId) { return prefs(c).getString(MAP + widgetId, ""); }
    static void setGoalForWidget(Context c, int widgetId, String goalId) { prefs(c).edit().putString(MAP + widgetId, goalId).apply(); }
    static int activeStreak(JSONObject g) {
        JSONObject entries = g.optJSONObject("journal");
        if (entries == null) return 0;
        Calendar c = Calendar.getInstance(); String t=today(), y=yesterday();
        if (!entries.has(t) && !entries.has(y)) return 0;
        if (!entries.has(t)) c.add(Calendar.DAY_OF_YEAR,-1);
        int count=0;
        while (true) { String key=new SimpleDateFormat("yyyy-MM-dd",Locale.US).format(c.getTime()); if(!entries.has(key)) break; count++; c.add(Calendar.DAY_OF_YEAR,-1); }
        return count;
    }
}
