package com.streakdown.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.text.SpannableString;
import android.text.Spanned;
import android.text.style.RelativeSizeSpan;
import android.util.SizeF;
import android.util.TypedValue;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

final class WidgetViews {
    static final String ACTION_CHECK_IN = "com.streakdown.app.WIDGET_CHECK_IN";
    private enum Layout { COMPACT, WIDE, EXPANDED }

    static RemoteViews create(Context context, int id) {
        JSONObject goal = WidgetStore.findGoal(context, WidgetStore.goalIdForWidget(context, id));
        float fontScale = Math.max(1f, context.getResources().getConfiguration().fontScale);
        int wide = Math.round(245 * fontScale);
        int expanded = Math.round(280 * fontScale);
        if (Build.VERSION.SDK_INT >= 31) {
            Map<SizeF, RemoteViews> sizes = new LinkedHashMap<>();
            sizes.put(new SizeF(120, 120), render(context, id, goal, Layout.COMPACT));
            sizes.put(new SizeF(wide, 130), render(context, id, goal, Layout.WIDE));
            sizes.put(new SizeF(wide, expanded), render(context, id, goal, Layout.EXPANDED));
            return new RemoteViews(sizes);
        }
        Bundle opts = AppWidgetManager.getInstance(context).getAppWidgetOptions(id);
        return new RemoteViews(
                render(context, id, goal, choose(opts.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH),
                        opts.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT), wide, expanded)),
                render(context, id, goal, choose(opts.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH),
                        opts.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT), wide, expanded)));
    }

    private static Layout choose(int width, int height, int wide, int expanded) {
        if (width < wide) return Layout.COMPACT;
        return height >= expanded ? Layout.EXPANDED : Layout.WIDE;
    }

    private static RemoteViews render(Context c, int id, JSONObject goal, Layout layout) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_large_native);
        Intent open = new Intent(c, MainActivity.class);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
        PendingIntent launch = PendingIntent.getActivity(c, id, open, flags);
        v.setOnClickPendingIntent(R.id.widget_root, launch);
        boolean compact = layout == Layout.COMPACT;
        v.removeAllViews(R.id.widget_subjects);
        v.setViewVisibility(R.id.widget_subjects, View.GONE);
        v.setViewVisibility(R.id.widget_progress, compact || goal == null ? View.GONE : View.VISIBLE);
        if (goal == null) {
            v.setTextViewText(R.id.widget_title, "Kairo");
            v.setTextViewText(R.id.widget_countdown, "Choose a goal");
            v.setTextViewTextSize(R.id.widget_countdown, TypedValue.COMPLEX_UNIT_SP, 17);
            v.setViewVisibility(R.id.widget_streak, View.GONE);
            v.setTextViewText(R.id.widget_checkin, "Open app");
            v.setOnClickPendingIntent(R.id.widget_checkin, launch);
            return v;
        }

        String today = WidgetStore.today();
        String target = goal.optString("targetDate", today);
        int days = 0;
        int progress = 0;
        String targetLabel = target;
        try {
            SimpleDateFormat iso = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
            Date due = iso.parse(target);
            Date now = iso.parse(today);
            days = (int) Math.round((due.getTime() - now.getTime()) / 86400000.0);
            targetLabel = new SimpleDateFormat("MMM d, yyyy", Locale.getDefault()).format(due);
            Date start = iso.parse(goal.optString("createdAt", today));
            double duration = due.getTime() - start.getTime();
            progress = duration <= 0 ? 100 : (int) Math.max(0, Math.min(100, 100 * (now.getTime() - start.getTime()) / duration));
        } catch (java.text.ParseException ignored) { }
        boolean complete = days <= 0;
        String streak = WidgetStore.activeStreak(goal) + "-day journal streak";
        v.setTextViewText(R.id.widget_title, goal.optString("title"));
        String number = String.valueOf(days);
        SpannableString countdown = new SpannableString(complete ? "Goal complete" : number + (days == 1 ? " day left" : " days left"));
        if (!complete) countdown.setSpan(new RelativeSizeSpan(0.52f), number.length(), countdown.length(), Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
        v.setTextViewText(R.id.widget_countdown, countdown);
        v.setTextViewTextSize(R.id.widget_countdown, TypedValue.COMPLEX_UNIT_SP, complete ? 19 : compact ? 26 : 32);
        v.setTextViewText(R.id.widget_target, compact ? streak : "Due " + targetLabel);
        v.setTextViewText(R.id.widget_streak, streak);
        v.setViewVisibility(R.id.widget_streak, compact ? View.GONE : View.VISIBLE);
        v.setProgressBar(R.id.widget_progress, 100, progress, false);
        JSONArray subjects = goal.optJSONArray("subjects");
        if (layout == Layout.EXPANDED && subjects != null && subjects.length() > 0) {
            v.setViewVisibility(R.id.widget_subjects, View.VISIBLE);
            addRow(c, v, "Subject", "To cover", "Awaiting 1st rev.");
            for (int i = 0; i < subjects.length(); i++) {
                JSONObject subject = subjects.optJSONObject(i);
                if (subject == null) continue;
                JSONArray chapters = subject.optJSONArray("chapters");
                int cover = 0;
                int revise = 0;
                for (int j = 0; chapters != null && j < chapters.length(); j++) {
                    JSONObject chapter = chapters.optJSONObject(j);
                    if (chapter == null) continue;
                    JSONArray revisions = chapter.optJSONArray("revisions");
                    if (chapter.optString("coveredAt").isEmpty()) cover++;
                    else if (revisions == null || revisions.length() == 0) revise++;
                }
                addRow(c, v, subject.optString("name"), String.valueOf(cover), String.valueOf(revise));
            }
        }
        JSONObject entries = goal.optJSONObject("journal");
        boolean checked = entries != null && entries.has(today);
        Intent journal = new Intent(c, MainActivity.class).setAction(ACTION_CHECK_IN)
                .putExtra("goal_id", goal.optString("id"));
        v.setViewVisibility(R.id.widget_checkin, complete ? View.GONE : View.VISIBLE);
        v.setTextViewText(R.id.widget_checkin, checked ? "Checked in ✓" : "Check in");
        v.setOnClickPendingIntent(R.id.widget_checkin, checked ? launch : PendingIntent.getActivity(c, id, journal, flags));
        return v;
    }

    private static void addRow(Context c, RemoteViews parent, String name, String cover, String revision) {
        RemoteViews row = new RemoteViews(c.getPackageName(), R.layout.widget_subject_row);
        row.setTextViewText(R.id.subject_name, name);
        row.setTextViewText(R.id.subject_cover, cover);
        row.setTextViewText(R.id.subject_revision, revision);
        parent.addView(R.id.widget_subjects, row);
    }

    static void refresh(Context c, Class<?> provider) {
        AppWidgetManager manager = AppWidgetManager.getInstance(c);
        for (int id : manager.getAppWidgetIds(new ComponentName(c, provider)))
            manager.updateAppWidget(id, create(c, id));
    }
}
