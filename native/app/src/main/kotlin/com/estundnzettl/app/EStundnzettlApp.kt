package com.estundnzettl.app

import android.app.Application
import com.estundnzettl.app.data.db.AppDatabase

class EStundnzettlApp : Application() {

    val database: AppDatabase by lazy { AppDatabase.get(this) }
}
