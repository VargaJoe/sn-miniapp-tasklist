import React, { useEffect, useState } from 'react'

// start of material imports
import { createStyles, makeStyles, Theme } from '@material-ui/core/styles'
import List from '@material-ui/core/List'
import ListItem from '@material-ui/core/ListItem'
import ListItemIcon from '@material-ui/core/ListItemIcon'
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction'
import ListItemText from '@material-ui/core/ListItemText'
import Checkbox from '@material-ui/core/Checkbox'
import IconButton from '@material-ui/core/IconButton'
import DeleteIcon from '@material-ui/icons/Delete'
import TextField from '@material-ui/core/TextField'
// end of material imports

// start of sensenet imports
import { ConstantContent, ODataCollectionResponse, ODataResponse } from '@sensenet/client-core'
import { Task } from '@sensenet/default-content-types'
import { Status } from '@sensenet/default-content-types/src/Enums'
import { useRepository } from '../hooks/use-repository'
// end of sensenet imports

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: theme.palette.background.paper,
    },
    container: {
      display: 'flex',
      flexWrap: 'wrap',
    },
    textField: {
      marginLeft: theme.spacing(1),
      marginRight: theme.spacing(1),
    },
  }),
)

/**
 * Todo List
 */
const TodoListPanel = () => {
  const repo = useRepository() // Custom hook that will return with a Repository object
  const classes = useStyles()
  const [data, setData] = useState<Task[]>([])
  const [newTask, setNewTask] = React.useState<string>('')

  useEffect(() => {
    /**
     * load from repo
     */
    async function loadContents() {
      const result: ODataCollectionResponse<Task> = await repo.loadCollection({
        path: `${ConstantContent.PORTAL_ROOT.Path}/Content/IT/Tasks`,
        oDataOptions: {
          select: ['DisplayName', 'Description', 'CreationDate', 'CreatedBy', 'Status'] as any,
          orderby: ['Status', ['CreationDate', 'desc']],
          expand: ['CreatedBy'] as any,
        },
      })

      setData(result.d.results)
    }
    loadContents()
  }, [repo])

  // Remove current task
  const deleteTask = async (task: Task) => {
    const newdata = [...data.filter(x => x.Id != task.Id)]
    await repo.delete({
      idOrPath: task.Path,
      permanent: true,
    })
    setData(newdata)
  }

  const toggleTask = async (task: Task) => {
    const currentIndex = data.indexOf(task)
    const newdata = [...data]

    // toggle current task status
    if (task.Status != 'completed') {
      await repo.patch<any>({
        idOrPath: task.Path,
        content: {
          Status: 'completed',
        },
      })
      newdata[currentIndex].Status = Status.completed
    } else {
      await repo.patch<any>({
        idOrPath: task.Path,
        content: {
          Status: 'active',
        },
      })
      newdata[currentIndex].Status = Status.active
    }

    // rearrange task order
    newdata.sort((a, b) => {
      if (a.Status === undefined || b.Status === undefined || a.Status === b.Status) {
        return a.CreationDate === undefined || b.CreationDate === undefined || a.CreationDate === b.CreationDate
          ? 0
          : a.CreationDate < b.CreationDate
          ? 1
          : -1
      } else {
        return a.Status > b.Status ? 1 : b.Status > a.Status ? -1 : 0
      }
    })

    // update data state
    setData(newdata)
  }

  // Create new task
  const createTask = async (text: string) => {
    const result: ODataResponse<Task> = await repo.post({
      parentPath: `${ConstantContent.PORTAL_ROOT.Path}/Content/IT/Tasks`,
      contentType: 'Task',
      content: {
        Name: text,
      },
    })
    // put new item top of the list
    const newdata = [result.d, ...data]

    // update data state
    setData(newdata)
  }

  const handleChange = () => (event: React.ChangeEvent<HTMLInputElement>) => {
    setNewTask(event.target.value)
  }

  const TodoInput = (
    <form
      className={classes.container}
      noValidate
      autoComplete="off"
      onSubmit={ev => {
        ev.preventDefault()
        createTask(newTask)
      }}>
      <TextField
        id="newTaskInput"
        label="New task"
        className={classes.textField}
        value={newTask}
        // onKeyPress={ev => {
        //   console.log(`Pressed keyCode ${ev.key}`)
        //   if (ev.key === 'Enter') {
        //     // Do code here
        //     ev.preventDefault()
        //     createTask('asd')
        //   }
        // }}
        onChange={handleChange()}
        margin="normal"
        variant="outlined"
      />
    </form>
  )

  const TodoItems = data.map(d => {
    const labelId = `checkbox-list-label-${d.Id}`
    const classCompleted = d.Status == 'completed' ? 'comp' : ''

    return (
      <ListItem key={d.Id} role={undefined} dense button onClick={() => toggleTask(d)}>
        <ListItemIcon>
          <Checkbox
            edge="start"
            checked={d.Status == 'completed'}
            tabIndex={-1}
            disableRipple
            inputProps={{ 'aria-labelledby': labelId }}
          />
        </ListItemIcon>
        <ListItemText id={labelId} primary={`${d.DisplayName}`} className={classCompleted} />
        <ListItemSecondaryAction>
          <IconButton edge="end" aria-label="Delete" onClick={() => deleteTask(d)}>
            <DeleteIcon />
          </IconButton>
        </ListItemSecondaryAction>
      </ListItem>
    )
  })

  return (
    <List className={classes.root}>
      {TodoInput}
      {TodoItems}
    </List>
  )
}

export default TodoListPanel
