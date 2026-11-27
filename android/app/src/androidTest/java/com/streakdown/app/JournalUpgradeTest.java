package com.streakdown.app;

import android.app.Instrumentation;
import android.content.Intent;
import androidx.test.platform.app.InstrumentationRegistry;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.TimeUnit;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import static org.junit.Assert.*;

public class JournalUpgradeTest {
    private final Instrumentation test = InstrumentationRegistry.getInstrumentation();
    private MainActivity activity;

    @Before public void launch() throws Exception {
        Intent intent = new Intent(test.getTargetContext(), MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        activity = (MainActivity) test.startActivitySync(intent);
        await("!!document.querySelector('input[type=file]')", "true");
    }

    @After public void close() {
        test.runOnMainSync(() -> activity.finish());
    }

    private String evaluate(String script) throws Exception {
        ArrayBlockingQueue<String> result = new ArrayBlockingQueue<>(1);
        test.runOnMainSync(() -> activity.getBridge().getWebView().evaluateJavascript(script, result::offer));
        return result.poll(10, TimeUnit.SECONDS);
    }

    private void await(String script, String value) throws Exception {
        for (int i = 0; i < 100; i++) {
            if (value.equals(evaluate(script))) return;
            Thread.sleep(200);
        }
        fail("Expected " + value + " from " + script);
    }

    @Test public void restoreSample() throws Exception {
        evaluate("(() => {const goal={id:'ca',title:'CA Final',createdAt:'2026-01-01T00:00:00Z',targetDate:'2030-01-01',checkIns:['2026-01-01'],journal:{'2026-01-02':{outcome:'Some of it',note:'Audit revision'}}};"
            + "const xml='<map><string name=\"goals_json\">'+JSON.stringify([goal])+'</string></map>';"
            + "const data=new DataTransfer();data.items.add(new File([xml],'Kairo-recovery.xml'));"
            + "const input=document.querySelector('input[type=file]');input.files=data.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()");
        await("document.body.innerText.includes('Restored 1 goal.')","true");
        verifySample();
    }

    @Test public void verifySample() throws Exception {
        await("(() => {const g=JSON.parse(localStorage.getItem('streakdown_goals_v1')||'[]')[0];return g?.title==='CA Final' && g.targetDate==='2030-01-01' && g.checkIns[0]==='2026-01-01' && g.journal['2026-01-02'].note==='Audit revision';})()", "true");
    }
}
